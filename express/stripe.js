const STRIPE_KEY = process.env.PROD === 'true' ? process.env.PROD_STRIPE_KEY : process.env.DEV_STRIPE_KEY;

const stripe = require('stripe')(STRIPE_KEY);

const createStripeSession = async (user) => {
  const giftCard = {
      uberEats: 'Uber Eats',
      netflix: 'Netflix',
      apple: 'Apple',
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: `${user.email}`,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'cad',
          product_data: {
            name: `Cannonball Raffle Ticket & $25 ${giftCard[user.gift]} Gift Card`,
            // TODO: fix
            images: ['../assets/logo.png'],
          },
          unit_amount: 2500,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/ticket`,
  });

  return session.id;
};

module.exports = {
    createStripeSession,
}