import React from 'react';
import ConnectivityBadge from './ConnectivityBadge';

/**
 * TAL-180 / TAL-182: Componente retrocompatible para NetworkStatusBanner.
 * Redirige al nuevo componente estándar flotante ConnectivityBadge
 * preservando la compatibilidad con suites de pruebas preexistentes y referencias cruzadas.
 */
const NetworkStatusBanner = (props) => <ConnectivityBadge {...props} />;

export default NetworkStatusBanner;
