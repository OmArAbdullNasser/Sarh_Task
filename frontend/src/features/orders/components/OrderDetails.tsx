import { Modal } from '../../../components/Modal';
import { ErrorNotice, Loading } from '../../../components/Feedback';
import { useRemote } from '../../../hooks/useRemote';
import { useI18n } from '../../../lib/i18n';
import type { Order } from '../orders.types';
export function OrderDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, date, money, number } = useI18n(); const { data, error, loading, retry } = useRemote<{ order: Order }>(`/api/orders/${id}`);
  return <Modal title={t('orderDetails')} onClose={onClose} wide>{loading ? <Loading/> : error ? <ErrorNotice error={error} retry={retry}/> : data && <div className="order-detail">
    <div className="detail-top"><div><span className="mono full-order-id">#{data.order._id}</span><p>{date(data.order.createdAt, true)}</p></div><span className={`status-pill status-${data.order.status}`}><i/>{t(data.order.status)}</span></div>
    <div className="detail-customer"><small>{t('customer')}</small><strong>{data.order.customerName}</strong><span dir="ltr">{data.order.customerEmail}</span></div>
    <div className="table-scroll"><table><thead><tr><th>{t('product')}</th><th>{t('quantity')}</th><th>{t('unitPrice')}</th><th>{t('total')}</th></tr></thead><tbody>{data.order.items.map(item => <tr key={item.productId}><td>{item.name}</td><td>{number(item.quantity)}</td><td className="money">{money(item.unitPriceMinor)}</td><td className="money">{money(item.quantity * item.unitPriceMinor)}</td></tr>)}</tbody></table></div>
    <div className="detail-total"><span>{t('total')}</span><strong>{money(data.order.totalMinor)}</strong></div><small className="muted">{t('saudiTime')}</small>
  </div>}</Modal>;
}
