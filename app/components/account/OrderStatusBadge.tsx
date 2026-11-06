import {Badge} from '~/components/ui/primitives';

const LABELS: Record<string, {label: string; tone: 'neutral' | 'success' | 'accent' | 'sale'}> = {
  FULFILLED: {label: 'Fulfilled', tone: 'success'},
  UNFULFILLED: {label: 'Processing', tone: 'neutral'},
  PARTIALLY_FULFILLED: {label: 'Partially shipped', tone: 'accent'},
  IN_PROGRESS: {label: 'In progress', tone: 'neutral'},
  ON_HOLD: {label: 'On hold', tone: 'neutral'},
  OPEN: {label: 'Open', tone: 'neutral'},
  SCHEDULED: {label: 'Scheduled', tone: 'neutral'},
  RESTOCKED: {label: 'Restocked', tone: 'neutral'},
  PENDING_FULFILLMENT: {label: 'Pending', tone: 'neutral'},
  SUCCESS: {label: 'Shipped', tone: 'success'},
  CANCELLED: {label: 'Cancelled', tone: 'sale'},
  ERROR: {label: 'Error', tone: 'sale'},
  FAILURE: {label: 'Failed', tone: 'sale'},
  // Shipment statuses
  CONFIRMED: {label: 'Confirmed', tone: 'neutral'},
  IN_TRANSIT: {label: 'In transit', tone: 'accent'},
  OUT_FOR_DELIVERY: {label: 'Out for delivery', tone: 'accent'},
  DELIVERED: {label: 'Delivered', tone: 'success'},
  ATTEMPTED_DELIVERY: {label: 'Delivery attempted', tone: 'sale'},
  READY_FOR_PICKUP: {label: 'Ready for pickup', tone: 'accent'},
  LABEL_PRINTED: {label: 'Label created', tone: 'neutral'},
  LABEL_PURCHASED: {label: 'Label created', tone: 'neutral'},
};

export function orderStatusLabel(status?: string | null) {
  if (!status) return null;
  return LABELS[status] ?? {label: status.replace(/_/g, ' ').toLowerCase(), tone: 'neutral' as const};
}

export function OrderStatusBadge({status}: {status?: string | null}) {
  const s = orderStatusLabel(status);
  if (!s) return null;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
