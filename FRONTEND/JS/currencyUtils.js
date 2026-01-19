// ===== UTILIDADES DE CONVERSIÓN DE MONEDA =====

// Usar API_BASE_URL existente o definir uno nuevo
const CURRENCY_API_URL =
  typeof API_BASE_URL !== "undefined"
    ? API_BASE_URL
    : "http://localhost:3000/api";

// Tasas de conversión desde MXN (sincronizadas con el backend)
const exchangeRates = {
  MXN: 1,
  USD: 0.058,
  EUR: 0.053,
  COP: 230,
  ARS: 52,
  CLP: 52,
  CAD: 0.079,
  BRL: 0.28,
  PEN: 0.22,
  GTQ: 0.45,
};

// Símbolos de moneda
const currencySymbols = {
  MXN: "$",
  USD: "$",
  EUR: "€",
  COP: "$",
  ARS: "$",
  CLP: "$",
  CAD: "$",
  BRL: "R$",
  PEN: "S/",
  GTQ: "Q",
};

// Mapeo de códigos de moneda a códigos de país
const currencyToCountry = {
  MXN: "MX",
  USD: "US",
  EUR: "ES",
  COP: "CO",
  ARS: "AR",
  CLP: "CL",
  CAD: "CA",
  BRL: "BR",
  PEN: "PE",
  GTQ: "GT",
};

// Mapeo de códigos de país a códigos de moneda
const countryToCurrency = {
  MX: "MXN",
  US: "USD",
  ES: "EUR",
  CO: "COP",
  AR: "ARS",
  CL: "CLP",
  CA: "CAD",
  BR: "BRL",
  PE: "PEN",
  GT: "GTQ",
};

// Estado de la moneda del usuario
let userCurrency = {
  code: "MXN",
  symbol: "$",
  rate: 1,
  countryCode: "MX",
};

// Funciones de autenticación locales (solo si no existen globalmente)
function _currencyGetAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function _currencyGetAuthHeaders() {
  const token = _currencyGetAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function _currencyIsLoggedIn() {
  return !!_currencyGetAuthToken();
}

// Cargar la moneda del usuario desde su perfil
async function loadUserCurrency() {
  if (!_currencyIsLoggedIn()) {
    userCurrency = { code: "MXN", symbol: "$", rate: 1, countryCode: "MX" };
    return userCurrency;
  }

  try {
    const response = await fetch(`${CURRENCY_API_URL}/users/profile`, {
      headers: _currencyGetAuthHeaders(),
    });

    if (!response.ok) {
      console.warn("Error en respuesta de perfil:", response.status);
      return userCurrency;
    }

    const data = await response.json();

    if (data.success && data.user && data.user.country) {
      const countryCode = data.user.country;
      // Normalizar código (puede ser código de país o moneda)
      const normalizedCountry = currencyToCountry[countryCode]
        ? currencyToCountry[countryCode]
        : countryCode;
      const currency =
        countryToCurrency[normalizedCountry] ||
        countryToCurrency[countryCode] ||
        countryCode;

      userCurrency = {
        code: currency,
        symbol: currencySymbols[currency] || "$",
        rate: exchangeRates[currency] || 1,
        countryCode: normalizedCountry || "MX",
      };
    }
  } catch (error) {
    console.error("Error al cargar moneda del usuario:", error);
  }

  return userCurrency;
}

// Convertir precio de MXN a la moneda del usuario
function convertPrice(priceInMXN, targetCurrency = null) {
  const currency = targetCurrency || userCurrency.code;
  const rate = exchangeRates[currency] || 1;
  return Math.round(priceInMXN * rate * 100) / 100;
}

// Formatear precio con símbolo
function formatPrice(priceInMXN, targetCurrency = null) {
  const currency = targetCurrency || userCurrency.code;
  const symbol = currencySymbols[currency] || "$";
  const converted = convertPrice(priceInMXN, currency);

  // Formato diferente para monedas con valores grandes
  if (currency === "COP" || currency === "CLP" || currency === "ARS") {
    return `${symbol}${converted.toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  return `${symbol}${converted.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Formatear precio con código de moneda
function formatPriceWithCurrency(priceInMXN, targetCurrency = null) {
  const currency = targetCurrency || userCurrency.code;
  return `${formatPrice(priceInMXN, currency)} ${currency}`;
}

// Obtener el estado actual de la moneda del usuario
function getUserCurrency() {
  return userCurrency;
}

// Obtener símbolo de moneda
function getCurrencySymbol(currency = null) {
  return currencySymbols[currency || userCurrency.code] || "$";
}

// Exportar funciones globales
window.loadUserCurrency = loadUserCurrency;
window.convertPrice = convertPrice;
window.formatPrice = formatPrice;
window.formatPriceWithCurrency = formatPriceWithCurrency;
window.getUserCurrency = getUserCurrency;
window.getCurrencySymbol = getCurrencySymbol;
window.exchangeRates = exchangeRates;
window.currencySymbols = currencySymbols;
