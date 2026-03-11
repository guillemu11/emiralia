import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Mock properties data
const mockProperties = [
  {
    pf_id: 'pf-1',
    title: 'Marina Bay Residences',
    display_address: 'Dubai Marina, Dubai',
    community: 'Dubai Marina',
    city: 'Dubai',
    property_type: 'Apartment',
    bedrooms: '2 BR',
    bedrooms_value: 2,
    bathrooms: 2,
    size_sqft: 1200,
    price_aed: 2500000,
    furnishing: 'Unfurnished',
    completion_status: 'Off-Plan',
    is_off_plan: true,
    is_verified: true,
    is_premium: false,
    is_featured: true,
    is_exclusive: false,
    images: ['https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800'],
    agent_name: 'Ahmed Al Mansouri',
    broker_name: 'Emaar Properties',
    latitude: 25.0807,
    longitude: 55.1396
  },
  {
    pf_id: 'pf-2',
    title: 'Downtown Dubai Penthouse',
    display_address: 'Downtown Dubai, Dubai',
    community: 'Downtown',
    city: 'Dubai',
    property_type: 'Penthouse',
    bedrooms: '3 BR',
    bedrooms_value: 3,
    bathrooms: 3,
    size_sqft: 2500,
    price_aed: 5800000,
    furnishing: 'Furnished',
    completion_status: 'Ready',
    is_off_plan: false,
    is_verified: true,
    is_premium: true,
    is_featured: true,
    is_exclusive: true,
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800'],
    agent_name: 'Sarah Johnson',
    broker_name: 'Damac Properties',
    latitude: 25.1972,
    longitude: 55.2744
  },
  {
    pf_id: 'pf-3',
    title: 'Palm Jumeirah Villa',
    display_address: 'Palm Jumeirah, Dubai',
    community: 'Palm Jumeirah',
    city: 'Dubai',
    property_type: 'Villa',
    bedrooms: '5 BR',
    bedrooms_value: 5,
    bathrooms: 6,
    size_sqft: 4500,
    price_aed: 12000000,
    furnishing: 'Furnished',
    completion_status: 'Ready',
    is_off_plan: false,
    is_verified: true,
    is_premium: true,
    is_featured: true,
    is_exclusive: true,
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=800'],
    agent_name: 'Mohammed Hassan',
    broker_name: 'Nakheel',
    latitude: 25.1124,
    longitude: 55.1390
  },
  {
    pf_id: 'pf-4',
    title: 'Business Bay Studio',
    display_address: 'Business Bay, Dubai',
    community: 'Business Bay',
    city: 'Dubai',
    property_type: 'Studio',
    bedrooms: 'Studio',
    bedrooms_value: 0,
    bathrooms: 1,
    size_sqft: 450,
    price_aed: 850000,
    furnishing: 'Unfurnished',
    completion_status: 'Off-Plan',
    is_off_plan: true,
    is_verified: false,
    is_premium: false,
    is_featured: false,
    is_exclusive: false,
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800'],
    agent_name: 'Fatima Al Zaabi',
    broker_name: 'Dubai Properties',
    latitude: 25.1870,
    longitude: 55.2634
  },
  {
    pf_id: 'pf-5',
    title: 'Jumeirah Beach Residence',
    display_address: 'JBR, Dubai',
    community: 'Jumeirah Beach Residence',
    city: 'Dubai',
    property_type: 'Apartment',
    bedrooms: '1 BR',
    bedrooms_value: 1,
    bathrooms: 2,
    size_sqft: 850,
    price_aed: 1650000,
    furnishing: 'Furnished',
    completion_status: 'Ready',
    is_off_plan: false,
    is_verified: true,
    is_premium: false,
    is_featured: true,
    is_exclusive: false,
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800'],
    agent_name: 'Omar Abdullah',
    broker_name: 'Emaar Properties',
    latitude: 25.0695,
    longitude: 55.1336
  },
  {
    pf_id: 'pf-6',
    title: 'Arabian Ranches Townhouse',
    display_address: 'Arabian Ranches, Dubai',
    community: 'Arabian Ranches',
    city: 'Dubai',
    property_type: 'Townhouse',
    bedrooms: '3 BR',
    bedrooms_value: 3,
    bathrooms: 4,
    size_sqft: 2200,
    price_aed: 3200000,
    furnishing: 'Unfurnished',
    completion_status: 'Ready',
    is_off_plan: false,
    is_verified: true,
    is_premium: false,
    is_featured: false,
    is_exclusive: false,
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800'],
    agent_name: 'Layla Mohammed',
    broker_name: 'Emaar Properties',
    latitude: 25.0571,
    longitude: 55.2890
  }
];

// GET /api/properties
app.get('/api/properties', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 24;

  let filtered = [...mockProperties];

  // Apply filters
  if (req.query.property_type) {
    filtered = filtered.filter(p => p.property_type === req.query.property_type);
  }
  if (req.query.bedrooms) {
    const beds = req.query.bedrooms.split(',');
    filtered = filtered.filter(p => beds.includes(String(p.bedrooms_value)) || (beds.includes('0') && p.bedrooms_value === 0));
  }
  if (req.query.price_min) {
    filtered = filtered.filter(p => p.price_aed >= parseInt(req.query.price_min));
  }
  if (req.query.price_max) {
    filtered = filtered.filter(p => p.price_aed <= parseInt(req.query.price_max));
  }
  if (req.query.is_off_plan === 'true') {
    filtered = filtered.filter(p => p.is_off_plan === true);
  }
  if (req.query.is_verified === 'true') {
    filtered = filtered.filter(p => p.is_verified === true);
  }

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  res.json({
    data: paginated,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
});

// GET /api/properties/map
app.get('/api/properties/map', (req, res) => {
  const markers = mockProperties.map(p => ({
    pf_id: p.pf_id,
    lat: p.latitude,
    lng: p.longitude,
    price_aed: p.price_aed,
    is_off_plan: p.is_off_plan
  }));

  res.json({ markers });
});

// GET /api/properties/:pf_id
app.get('/api/properties/:pf_id', (req, res) => {
  const property = mockProperties.find(p => p.pf_id === req.params.pf_id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }
  res.json(property);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok (MOCK API)', timestamp: new Date() });
});

app.listen(port, () => {
  console.log(`🚀 Mock API server listening at http://localhost:${port}`);
  console.log(`📊 Serving ${mockProperties.length} mock properties`);
  console.log(`⚠️  This is a TEMPORARY mock server. Replace with real API when Docker is ready.`);
});
