export const areAuthGuardsDisabled = () =>
  process.env.AUTH_GUARDS_DISABLED === 'true' &&
  process.env.NODE_ENV !== 'production';
