import OpenContext from './OpenContext.jsx'
import { useEffect, useMemo, useState } from 'react'
import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { queryPresets, seedSql } from './seed.js'

const statusFlow = ['Новый', 'В обработке', 'Доставлен']

function normalizeRows(result) {
  if (!result?.length) return []

  const [table] = result
  return table.values.map((row) =>
    table.columns.reduce((acc, column, index) => ({ ...acc, [column]: row[index] }), {}),
  )
}

export default function App() {
  const [view,setView]=useState("orders")
  const [db, setDb] = useState(null)
  const [orders, setOrders] = useState([])
  const [sellers, setSellers] = useState([])
  const [products, setProducts] = useState([])
  const [events, setEvents] = useState([])
  const [sqlQuery, setSqlQuery] = useState(queryPresets[0].sql)
  const [queryRows, setQueryRows] = useState([])
  const [queryError, setQueryError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Все')

  const reloadCrmData = (database) => {
    setOrders(
      normalizeRows(
        database.exec(`
          SELECT o.id, o.order_code, o.status, o.total, o.created_at,
                 s.name AS seller, p.title AS product
          FROM orders o
          JOIN sellers s ON s.id = o.seller_id
          JOIN products p ON p.id = o.product_id
          ORDER BY o.id DESC;
        `),
      ),
    )
    setSellers(normalizeRows(database.exec('SELECT * FROM sellers ORDER BY rating DESC;')))
    setProducts(normalizeRows(database.exec('SELECT * FROM products ORDER BY stock ASC;')))
    setEvents(normalizeRows(database.exec('SELECT * FROM events ORDER BY id DESC;')))
  }

  useEffect(() => {
    let disposed = false
    let database
    initSqlJs({ locateFile: () => wasmUrl }).then((SQL) => {
      if (disposed) return
      try {
        const saved = localStorage.getItem('marketplace-ops-db-v1')
        database = saved ? new SQL.Database(Uint8Array.from(JSON.parse(saved))) : new SQL.Database()
        if (!saved) database.run(seedSql)
        reloadCrmData(database)
      } catch {
        database?.close()
        database = new SQL.Database()
        database.run(seedSql)
        reloadCrmData(database)
      }
      setDb(database)
      setQueryRows(normalizeRows(database.exec(queryPresets[0].sql)))
    }).catch(() => { if (!disposed) setLoadError('Не удалось загрузить базу. Обновите страницу и проверьте соединение.') })
    return () => { disposed = true; database?.close() }
  }, [])

  const visibleOrders = orders.filter(order => (statusFilter === 'Все' || order.status === statusFilter) && `${order.order_code} ${order.seller} ${order.product}`.toLowerCase().includes(search.toLowerCase()))

  const metrics = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + order.total, 0)
    const activeOrders = orders.filter((order) => order.status !== 'Доставлен').length
    const stockRisk = products.filter((product) => product.stock < 30).length

    return [
      { label: 'Сумма заказов', value: `${revenue.toLocaleString('ru-RU')} ₽` },
      { label: 'Активные заказы', value: activeOrders },
      { label: 'Продавцы', value: sellers.length },
      { label: 'SKU с низким остатком', value: stockRisk },
    ]
  }, [orders, products, sellers.length])

  const runQuery = () => {
    if (!db) return

    try {
      if (!/^\s*SELECT\b/i.test(sqlQuery) || /;\s*\S/.test(sqlQuery)) throw new Error('Консоль принимает один SELECT-запрос. Для изменения статуса используйте карточку заказа.')
      const result = db.exec(sqlQuery)
      setQueryRows(normalizeRows(result))
      setQueryError(result.length ? '' : 'Запрос выполнен, но строк в результате нет.')
    } catch (error) {
      setQueryRows([])
      setQueryError(error.message)
    }
  }

  const advanceOrderStatus = (order) => {
    if (!db || order.status === 'Доставлен') return

    const nextStatus =
      statusFlow[Math.min(statusFlow.indexOf(order.status) + 1, statusFlow.length - 1)] ||
      'В обработке'

    db.run(`UPDATE orders SET status = ? WHERE id = ?`, [nextStatus, order.id])
    db.run(
      `INSERT INTO events (channel, message, created_at) VALUES (?, ?, ?)`,
      [
        'Оператор',
        `Статус ${order.order_code} изменён на "${nextStatus}"`,
        new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      ],
    )

    try { localStorage.setItem('marketplace-ops-db-v1', JSON.stringify(Array.from(db.export()))) }
    catch { setLoadError('Изменения доступны до закрытия страницы: хранилище браузера недоступно.') }
    reloadCrmData(db)
    try { if (/^\s*SELECT\b/i.test(sqlQuery) && !/;\s*\S/.test(sqlQuery)) setQueryRows(normalizeRows(db.exec(sqlQuery))) } catch { setQueryError('Статус сохранён. Исправьте запрос, чтобы обновить таблицу.') }
  }

  return (
    <div className="crm-shell">
      <header className="product-topbar"><a href="#workspace">Операции / Маркетплейс</a><nav><a href="#workspace">Рабочая область</a><a href="#sources" onClick={()=>{document.getElementById("sources").open=true}}>Справочник</a><a href="https://cherreshenka1.github.io/portfolio/">Портфолио ↗</a></nav><span className="monogram">АБ</span></header>
      <header className="crm-hero">
        <p className="eyebrow">Рабочая область продавца</p>
        <h1>Заказы и остатки</h1>
        <p className="hero-text">От заказа до доставки: статусы, продавцы и история действий в одном рабочем пространстве.</p>
      </header>

      <p className="demo-note">Учебная CRM. Данные и события демонстрационные, интеграции не подключены.</p>{loadError && <p role="alert">{loadError}</p>}{!db && !loadError && <p role="status">Загружаем рабочую область…</p>}<section className="metrics-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <nav className="crm-tabs" aria-label="Рабочие области">{[["orders","Заказы"],["partners","Продавцы и события"],["sql","Данные / SQL"]].map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}</nav><main id="workspace" className="ops-grid" hidden={view==="sql"}>
        <section className="orders-panel" hidden={view!=="orders"}>
          <div className="panel-head">
            <h2>Заказы</h2>
            <span>{orders.length} заказов</span>
          </div>

          <div className="inline-tools"><input type="search" aria-label="Поиск заказов" placeholder="Номер, продавец или товар" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Статус заказа" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>{['Все',...statusFlow].map(status=><option key={status}>{status}</option>)}</select></div><div className="orders-list">{db && !visibleOrders.length && <p className="empty-text">По этим условиям заказов нет. Измените поиск или статус.</p>}
            {visibleOrders.map((order) => (
              <article className="order-row" key={order.id}>
                <div>
                  <p>{order.order_code}</p>
                  <strong>{order.product}</strong>
                  <small>{order.seller} • {order.created_at}</small>
                </div>
                <div className="order-meta">
                  <b>{order.total.toLocaleString('ru-RU')} ₽</b>
                  <span>{order.status}</span>
                </div>
                <button type="button" disabled={order.status === 'Доставлен'} onClick={() => advanceOrderStatus(order)}>
                  {order.status === 'Новый' ? 'Взять в работу' : order.status === 'В обработке' ? 'Подтвердить доставку' : 'Доставлен'}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="side-stack" hidden={view!=="partners"}>
          <article className="sellers-panel">
            <div className="panel-head">
              <h2>Продавцы</h2>
              <span>{sellers.length}</span>
            </div>
            <div className="mini-list">
              {sellers.map((seller) => (
                <div className="mini-card" key={seller.id}>
                  <div>
                    <strong>{seller.name}</strong>
                    <p>{seller.segment} • {seller.city}</p>
                  </div>
                  <span>{seller.rating}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="events-panel">
            <div className="panel-head">
              <h2>История действий</h2>
              <span>Демо-события</span>
            </div>
            <div className="mini-list">
              {events.map((event) => (
                <div className="event-card" key={event.id}>
                  <p>{event.channel} • {event.created_at}</p>
                  <strong>{event.message}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>

      <section className="sql-console" hidden={view!=="sql"}>
        <div className="panel-head">
          <h2>SQL-консоль</h2>
          <div className="preset-row">
            {queryPresets.map((preset) => (
              <button type="button" key={preset.title} onClick={() => setSqlQuery(preset.sql)}>
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        <textarea
          aria-label="SELECT-запрос" value={sqlQuery}
          onChange={(event) => setSqlQuery(event.target.value)}
          rows="8"
          spellCheck="false"
        />

        <button type="button" className="run-btn" onClick={runQuery}>
          Выполнить SQL
        </button>

        {queryError && <div className="query-error">{queryError}</div>}

        <div className="result-table-wrap">
          {queryRows.length === 0 ? (
            <p className="empty-text">Результат появится после выполнения SQL-запроса.</p>
          ) : (
            <table className="result-table">
              <thead>
                <tr>
                  {Object.keys(queryRows[0]).map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryRows.map((row, index) => (
                  <tr key={`${Object.values(row).join('-')}-${index}`}>
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={`${cellIndex}-${String(value)}`}>{String(value)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <details className="sources" id="sources"><summary>О базе и справочных данных</summary><OpenContext/></details>
    </div>
  )
}
