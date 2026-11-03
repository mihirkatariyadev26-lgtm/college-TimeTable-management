export const getAllowedOrigins = () => [
  process.env.FRONTEND_URL,
  'https://vvp-college-timetable-management.onrender.com',
  'http://localhost:5173',
].filter(Boolean);
