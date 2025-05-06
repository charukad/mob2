/**
 * Utility functions for handling user roles
 */

/**
 * Check if a user has a specific role
 * @param {Object} user - The user object from Redux
 * @param {string} role - The role to check (tourist, guide, vehicleOwner)
 * @returns {boolean} - Whether the user has the specified role
 */
export const hasRole = (user, role) => {
  if (!user) return false;
  return user.role === role;
};

/**
 * Check if the user is a tourist
 * @param {Object} user - The user object from Redux
 * @returns {boolean} - Whether the user is a tourist
 */
export const isTourist = (user) => hasRole(user, 'tourist');

/**
 * Check if the user is a guide
 * @param {Object} user - The user object from Redux
 * @returns {boolean} - Whether the user is a guide
 */
export const isGuide = (user) => hasRole(user, 'guide');

/**
 * Check if the user is a vehicle owner
 * @param {Object} user - The user object from Redux
 * @returns {boolean} - Whether the user is a vehicle owner
 */
export const isVehicleOwner = (user) => hasRole(user, 'vehicleOwner');

/**
 * Get the dashboard name based on the user's role
 * @param {Object} user - The user object from Redux
 * @returns {string} - The appropriate dashboard name
 */
export const getDashboardName = (user) => {
  if (!user) return 'Tourist Dashboard';
  
  switch (user.role) {
    case 'vehicleOwner':
      return 'Vehicle Owner Dashboard';
    case 'guide':
      return 'Guide Dashboard';
    case 'tourist':
    default:
      return 'Tourist Dashboard';
  }
};

/**
 * Check if a component should be accessible based on roles
 * @param {Object} user - The user object from Redux
 * @param {Array<string>} allowedRoles - Array of roles that can access this component
 * @returns {boolean} - Whether the user can access the component
 */
export const canAccess = (user, allowedRoles) => {
  if (!user || !allowedRoles) return false;
  return allowedRoles.includes(user.role);
};

/**
 * Create a debug string with user role info
 * @param {Object} user - The user object from Redux
 * @returns {string} - Debug string with user role information
 */
export const debugRoleInfo = (user) => {
  if (!user) return 'No user found';
  return `User ID: ${user._id}, Role: ${user.role}, Email: ${user.email}`;
};

export default {
  hasRole,
  isTourist,
  isGuide,
  isVehicleOwner,
  getDashboardName,
  canAccess,
  debugRoleInfo,
}; 