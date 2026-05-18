'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { X, Calendar, Mail, Phone, DollarSign, Package, Trash2, Edit2, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { StripeCheckoutButton } from '@/components/StripeCheckoutButton';
import Image from 'next/image';
import { toast } from '@/hooks/useToast';

import { Order } from '@/types/database';

interface OrderManagementModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderManagementModal({ order, isOpen, onClose, onUpdate }: OrderManagementModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Order | null>(order);
  const supabase = createBrowserClient();

  if (!isOpen || !order) return null;

  const handleSave = async () => {
    if (!editedOrder) return;

    setLoading(true);
    const statusChanged = editedOrder.status !== order.status;
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: editedOrder.customer_name,
          customer_email: editedOrder.customer_email,
          customer_phone: editedOrder.customer_phone,
          total_price: editedOrder.total_price,
          delivery_date: editedOrder.delivery_date,
          notes: editedOrder.notes,
          status: editedOrder.status,
        })
        .eq('id', editedOrder.id);

      if (error) throw error;

      // Non-blocking status update email to customer
      if (statusChanged) {
        fetch('/api/order-status-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: editedOrder.id, event: editedOrder.status }),
        }).catch((err) => console.error('order-status-email failed:', err));
      }

      setIsEditing(false);
      onUpdate();
      toast.success('Order updated successfully!');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (error) throw error;

      onUpdate();
      onClose();
      toast.success('Order deleted successfully!');
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = ['pending', 'confirmed', 'paid', 'preparing', 'ready', 'delivered', 'cancelled'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 rounded-t-[2rem] flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-secondary">Order Details</h2>
            <p className="text-xs text-gray-400 mt-1">ID: {order.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Design Preview */}
          {order.cake_designs && (
            <div className="bg-gray-50 rounded-2xl p-4 flex gap-4 items-center">
              <div className="relative w-20 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0">
                {order.cake_designs?.image_url ? (
                  <Image src={order.cake_designs.image_url} alt={order.cake_designs.title || "Cake design"} className="w-full h-full object-cover" fill unoptimized={order.cake_designs.image_url.startsWith('data:')} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🎂</div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-secondary">{order.cake_designs?.title}</h3>
                <p className="text-xs text-gray-400">Design Template</p>
              </div>
            </div>
          )}

          {/* Customer Info */}
          <div className="space-y-4">
            <h3 className="font-bold text-secondary flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Customer Information
            </h3>

            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedOrder?.customer_name || ''}
                  onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_name: e.target.value } : prev)}
                  placeholder="Customer Name"
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="email"
                  value={editedOrder?.customer_email || ''}
                  onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_email: e.target.value } : prev)}
                  placeholder="Email"
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="tel"
                  value={editedOrder?.customer_phone || ''}
                  onChange={(e) => setEditedOrder(prev => prev ? { ...prev, customer_phone: e.target.value } : prev)}
                  placeholder="Phone"
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2"><strong>Name:</strong> {order.customer_name || 'N/A'}</p>
                <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {order.customer_email}</p>
                {order.customer_phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> {order.customer_phone}</p>}
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="space-y-4">
            <h3 className="font-bold text-secondary flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Order Details
            </h3>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Total Price</label>
                  <input
                    type="number"
                    value={editedOrder?.total_price || 0}
                    onChange={(e) => setEditedOrder(prev => prev ? { ...prev, total_price: parseFloat(e.target.value) } : prev)}
                    className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Delivery Date</label>
                  <input
                    type="datetime-local"
                    value={editedOrder?.delivery_date ? new Date(editedOrder.delivery_date).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditedOrder(prev => prev ? { ...prev, delivery_date: e.target.value } : prev)}
                    className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Status</label>
                  <select
                    value={editedOrder?.status || 'pending'}
                    onChange={(e) => setEditedOrder(prev => prev ? { ...prev, status: e.target.value as Order['status'] } : prev)}
                    className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                  <textarea
                    value={editedOrder?.notes || ''}
                    onChange={(e) => setEditedOrder(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                    rows={3}
                    className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p><strong>Total:</strong> ${order.total_price.toFixed(2)}</p>
                <p><strong>Deposit:</strong> ${order.deposit_paid.toFixed(2)}</p>
                <p className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <strong>Delivery:</strong> {order.delivery_date ? new Date(order.delivery_date).toLocaleString() : 'Not set'}
                </p>
                <p><strong>Status:</strong> <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-bold uppercase">{order.status}</span></p>
                {order.notes && (
                  <div>
                    <strong>Notes:</strong>
                    <p className="mt-1 p-3 bg-gray-50 rounded-xl text-gray-600">{order.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 rounded-b-[2rem] flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedOrder(order);
                }}
                className="flex-1 btn btn-secondary py-3 flex items-center justify-center gap-2"
                disabled={loading}
              >
                <XCircle className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2"
                disabled={loading}
              >
                <CheckCircle2 className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              {!order.is_paid && (
                <StripeCheckoutButton
                  checkoutType="order"
                  orderId={order.id}
                  className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Collect Payment
                </StripeCheckoutButton>
              )}
              <button
                onClick={() => {
                  setIsEditing(true);
                  setEditedOrder(order);
                }}
                className="flex-1 btn btn-secondary py-3 flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit Order
              </button>
              <button
                onClick={handleDelete}
                className="px-6 btn bg-red-500 hover:bg-red-600 text-white py-3 flex items-center justify-center gap-2"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4" /> {loading ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
