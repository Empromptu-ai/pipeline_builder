export const SERVER_LOCATION = import.meta.env.VITE_BACKEND_OVERRIDE ?? 'https://analytics.empromptu.ai';

// import.meta.env.VITE_BACKEND_OVERRIDE ?? "http://staging.impromptu-labs.com:5000";
// import.meta.env.VITE_BACKEND_OVERRIDE ?? "http://localhost:5000";
console.log('USE_DEV_OVERRIDE', process.env.USE_DEV_OVERRIDE);
console.log('ENABLE_MOCK_DATA', process.env.ENABLE_MOCK_DATA);
console.log('VITE_ENABLE_MOCK_DATA', process.env.VITE_ENABLE_MOCK_DATA);
export const ENABLE_MOCK_DATA = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';
