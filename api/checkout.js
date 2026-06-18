const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const line_items = items.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.name,
          description: [
            item.size && item.size !== 'One Size' ? `Size: ${item.size}` : null,
            item.color && item.color !== 'Default' ? `Colour: ${item.color}` : null
          ].filter(Boolean).join(' · ') || undefined
        },
        unit_amount: Math.round(Number(item.price) * 100)
      },
      quantity: Number(item.quantity) || 1
    }));

    const origin = req.headers.origin || `https://${req.headers.host}` || 'https://safespotlife.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['GB', 'US', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'IE', 'NZ', 'SG', 'JP']
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 500, currency: 'gbp' },
            display_name: 'Standard Shipping (3–5 business days)'
          }
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 800, currency: 'gbp' },
            display_name: 'Premium DPD + Tracking (1–2 business days)'
          }
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1600, currency: 'gbp' },
            display_name: 'International — EU'
          }
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1800, currency: 'gbp' },
            display_name: 'International — USA / Canada'
          }
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 2200, currency: 'gbp' },
            display_name: 'International — Rest of World'
          }
        }
      ],
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop.html`
    });

    res.status(200).json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
};
