// src/pages/auth/index.jsx already exports LoginPage + RegisterPage
// src/pages/admin/index.jsx already exports all admin pages
// src/pages/shopkeeper/index.jsx already exports all shopkeeper pages
// src/pages/delivery/index.jsx already exports all delivery pages
// src/pages/user/index.jsx already exports all user pages

// Re-export aliases for App.jsx imports
export { LoginPage, RegisterPage } from './auth/index'
