/**
 * tools/seo/schema-builder.js
 * Constructores de JSON-LD schemas para Emiralia.
 * Usados por el bot-detection middleware para enriquecer property pages.
 */

const BASE_URL = process.env.SITE_URL || 'https://emiralia.com';

/**
 * Schema Organization — para index.html
 */
export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Emiralia',
    url: BASE_URL,
    logo: `${BASE_URL}/og-image.jpg`,
    description: 'La primera plataforma en español que analiza el mercado inmobiliario de Emiratos Árabes Unidos en tiempo real.',
    foundingDate: '2024',
    areaServed: { '@type': 'Country', name: 'Emiratos Árabes Unidos' },
    knowsLanguage: 'es',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: 'Spanish',
    },
  };
}

/**
 * Schema RealEstateListing / Product — para propiedad.html
 * @param {Object} row - fila de la tabla properties
 */
export function buildPropertySchema(row) {
  const price = row.price ? Number(row.price) : null;
  const currency = row.currency || 'AED';
  const url = `${BASE_URL}/propiedad.html?id=${row.pf_id}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: row.title || `Propiedad en ${row.city || 'EAU'}`,
    description: row.description || `Propiedad en ${row.community || row.city || 'Emiratos Árabes Unidos'}`,
    url,
    image: row.photos?.[0] || `${BASE_URL}/og-image.jpg`,
    brand: {
      '@type': 'Organization',
      name: row.agent_name || row.agency_name || 'Emiralia',
    },
  };

  if (price) {
    schema.offers = {
      '@type': 'Offer',
      price,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      url,
    };
  }

  if (row.latitude && row.longitude) {
    schema.locationCreated = {
      '@type': 'Place',
      name: row.community || row.city || 'EAU',
      geo: {
        '@type': 'GeoCoordinates',
        latitude: row.latitude,
        longitude: row.longitude,
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: row.city || 'Dubai',
        addressCountry: 'AE',
      },
    };
  }

  return schema;
}

/**
 * Schema Article — para articulo.html
 * @param {Object} article - datos del artículo
 */
export function buildArticleSchema({ headline, description, url, datePublished, dateModified, image }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image: image || `${BASE_URL}/og-image.jpg`,
    author: { '@type': 'Organization', name: 'Emiralia', url: BASE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Emiralia',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/og-image.jpg` },
    },
    datePublished: datePublished || '2024-01-01',
    dateModified: dateModified || new Date().toISOString().split('T')[0],
    inLanguage: 'es',
    url: url || BASE_URL,
  };
}

/**
 * Schema FAQPage — para invertir.html y blog.html
 * @param {Array} faqs - [{ question, answer }]
 */
export function buildFAQSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

/**
 * Schema HowTo — para invertir.html
 * @param {Object} opts - { name, description, steps: [{ name, text }] }
 */
export function buildHowToSchema({ name, description, steps }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    inLanguage: 'es',
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

/**
 * Serializa uno o varios schemas a tag <script> JSON-LD
 */
export function toScriptTag(schema) {
  const json = JSON.stringify(Array.isArray(schema) ? schema : schema, null, 2);
  return `<script type="application/ld+json">\n${json}\n</script>`;
}
