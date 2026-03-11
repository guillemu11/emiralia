import './style.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  document.body.classList.add('styles-ready');

  const form = document.getElementById('interest-form');
  form.addEventListener('submit', handleSubmit);
});

async function handleSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-text');
  const submitLoader = document.getElementById('submit-loader');

  // Get form data
  const formData = new FormData(form);
  const name = formData.get('name');
  const email = formData.get('email');
  const country = formData.get('country');
  const message = formData.get('message');

  // Get selected interests
  const interestsCheckboxes = form.querySelectorAll('input[name="interests"]:checked');
  const interests = Array.from(interestsCheckboxes).map(cb => cb.value);

  // Disable button
  submitBtn.disabled = true;
  submitText.classList.add('hidden');
  submitLoader.classList.remove('hidden');
  if (window.lucide) {
    window.lucide.createIcons();
  }

  try {
    const response = await fetch(`${API_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        country: country || null,
        interests,
        source: 'interes',
        message: message || null,
        metadata: {
          timestamp: new Date().toISOString(),
          page: 'interes.html',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar');
    }

    // Success - show success card
    document.getElementById('form-card').classList.add('hidden');
    document.getElementById('success-card').classList.remove('hidden');
    if (window.lucide) {
      window.lucide.createIcons();
    }

  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Hubo un error al enviar el formulario. Por favor, inténtalo de nuevo.');

    // Re-enable button
    submitBtn.disabled = false;
    submitText.classList.remove('hidden');
    submitLoader.classList.add('hidden');
  }
}
