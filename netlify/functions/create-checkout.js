const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { items } = JSON.parse(event.body || '{}');

    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cart is empty' }) };
    }

    const line_items = items.map((item) => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.name,
          description: [
            item.size ? `Size: ${item.size}` : null,
            item.color ? `Colour: ${item.color}` : null
          ].filter(Boolean).join(' · ') || undefined
        },
        unit_amount: Math.round(Number(item.price) * 100)
      },
      quantity: item.quantity ? Number(item.quantity) : 1
    }));

    const origin =
      (event.headers && (event.headers.origin || event.headers.Origin)) ||
      `https://${event.headers && event.headers.host}` ||
      'https://safespotlife.netlify.app';

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
            display_name: 'Standard Shipping (3-5 business days)'
          }
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 800, currency: 'gbp' },
            display_name: 'Premium DPD Shipping + Tracking (1-2 business days)'
          }
        }
      ],
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop.html`
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sessionUrl: session.url, sessionId: session.id })
    };
  } catch (error) {
    console.error('create-checkout error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
