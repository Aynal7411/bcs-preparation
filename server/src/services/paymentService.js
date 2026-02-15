export async function initializePayment({ amount, invoiceId, method = 'sslcommerz' }) {
  if (method === 'sslcommerz') {
    return {
      gateway: 'sslcommerz',
      invoiceId,
      amount,
      paymentUrl: `${process.env.CLIENT_URL}/payment/mock/${invoiceId}`
    };
  }

  if (method === 'bkash') {
    return {
      gateway: 'bkash',
      invoiceId,
      amount,
      paymentUrl: `${process.env.CLIENT_URL}/payment/mock/${invoiceId}`
    };
  }

  throw new Error('Unsupported payment method');
}
