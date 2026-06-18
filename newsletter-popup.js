/* SAFE Blog Newsletter Popup */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize newsletter popup
  initNewsletterPopup();
});

function initNewsletterPopup() {
  // Check if user already subscribed (stored in localStorage)
  if (localStorage.getItem('safeNewsletterSubscribed')) {
    return; // Don't show if already subscribed
  }

  // Show popup after 30 seconds or when user scrolls 50% down page (whichever comes first)
  let popupShown = false;

  // Timer trigger: 30 seconds
  setTimeout(() => {
    if (!popupShown) {
      showNewsletterPopup();
      popupShown = true;
    }
  }, 30000);

  // Scroll trigger: when user scrolls past 50% of page
  window.addEventListener('scroll', () => {
    if (popupShown) return;

    const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

    if (scrollPercentage > 50) {
      showNewsletterPopup();
      popupShown = true;
    }
  }, { once: true });
}

function showNewsletterPopup() {
  const popup = document.getElementById('newsletter-popup');
  if (popup) {
    popup.classList.add('visible');
  }
}

function closeNewsletterPopup() {
  const popup = document.getElementById('newsletter-popup');
  if (popup) {
    popup.classList.remove('visible');
  }
}

function handleNewsletterSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const email = form.querySelector('input[type="email"]').value;
  const nameInput = form.querySelector('input[name="name"]');
  const name = nameInput ? nameInput.value : '';

  // Show loading state
  const submitBtn = form.querySelector('button');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Subscribing...';
  submitBtn.disabled = true;

  // Send to your backend or Mailchimp
  submitNewsletterEmail(email, name)
    .then(() => {
      // Success
      submitBtn.textContent = '✓ Welcome to the list!';
      form.reset();
      localStorage.setItem('safeNewsletterSubscribed', 'true');

      // Close popup after 2 seconds
      setTimeout(() => {
        closeNewsletterPopup();
      }, 2000);
    })
    .catch((error) => {
      // Error
      submitBtn.textContent = 'Error. Try again?';
      submitBtn.disabled = false;
      console.error('Newsletter subscription error:', error);

      // Reset after 3 seconds
      setTimeout(() => {
        submitBtn.textContent = originalText;
      }, 3000);
    });
}

function submitNewsletterEmail(email, name) {
  // Option 1: Send to your backend (RECOMMENDED - more secure)
  // Replace YOUR_BACKEND_URL with your actual backend endpoint

  return fetch('/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      name: name,
      source: 'blog-popup'
    })
  })
  .then(response => {
    if (!response.ok) throw new Error('Subscription failed');
    return response.json();
  });

  /* Option 2: Direct to Mailchimp (for testing, less secure)
  // Uncomment below and comment above to use this approach

  const MAILCHIMP_AUDIENCE_ID = 'YOUR_AUDIENCE_ID_HERE';
  const MAILCHIMP_API_KEY = 'YOUR_API_KEY_HERE';

  const mailchimpUrl = `https://us1.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members`;

  const subscriber = {
    email_address: email,
    status: 'pending',
    merge_fields: {
      FNAME: name || 'Subscriber'
    }
  };

  const auth = btoa(`anystring:${MAILCHIMP_API_KEY}`);

  return fetch(mailchimpUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscriber)
  })
  .then(response => {
    if (!response.ok) throw new Error('Mailchimp API error');
    return response.json();
  });
  */
}
