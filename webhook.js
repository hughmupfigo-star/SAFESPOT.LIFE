const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // For Vercel, req.body is already parsed
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;

      console.log('✓ Payment successful!');
      console.log('Session ID:', session.id);
      console.log('Customer email:', session.customer_email);
      console.log('Amount:', session.amount_total / 100, 'GBP');
      console.log('Metadata:', session.metadata);

      // TODO: Process the order here:
      // 1. Save order to database
      // 2. Send confirmation email
      // 3. Trigger fulfillment workflow
      // 4. Create shipping label

      break;

    case 'checkout.session.async_payment_failed':
      console.log('Payment failed for session:', event.data.object.id);
      // TODO: Handle failed payment
      break;

    case 'checkout.session.async_payment_succeeded':
      console.log('Async payment succeeded for session:', event.data.object.id);
      // TODO: Process async payment confirmation
      break;
  }

  res.status(200).json({ received: true });
}
