// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const pool = require("../config/database");

// ===== CONSTANTES =====
// Tasas de conversión desde MXN (precio base en la BD)
const exchangeRates = {
  MXN: 1,
  USD: 0.058, // 1 MXN = 0.058 USD
  EUR: 0.053, // 1 MXN = 0.053 EUR
  COP: 230, // 1 MXN = 230 COP
  ARS: 52, // 1 MXN = 52 ARS
  CLP: 52, // 1 MXN = 52 CLP
  CAD: 0.079, // 1 MXN = 0.079 CAD
  BRL: 0.28, // 1 MXN = 0.28 BRL
  PEN: 0.22, // 1 MXN = 0.22 PEN
  GTQ: 0.45, // 1 MXN = 0.45 GTQ
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

// Configuración de países con impuestos y envíos
const countriesConfig = {
  MX: {
    name: "México",
    code: "MX",
    currency: "MXN",
    taxRate: 0.16, // IVA 16%
    taxName: "IVA",
    shipping: {
      standard: 99,
      express: 199,
      free_threshold: 1500, // Envío gratis sobre este monto
    },
  },
  US: {
    name: "Estados Unidos",
    code: "US",
    currency: "USD",
    taxRate: 0.0825, // Sales tax promedio ~8.25%
    taxName: "Sales Tax",
    shipping: {
      standard: 15,
      express: 35,
      free_threshold: 100,
    },
  },
  ES: {
    name: "España",
    code: "ES",
    currency: "EUR",
    taxRate: 0.21, // IVA 21%
    taxName: "IVA",
    shipping: {
      standard: 12,
      express: 25,
      free_threshold: 80,
    },
  },
  CO: {
    name: "Colombia",
    code: "CO",
    currency: "COP",
    taxRate: 0.19, // IVA 19%
    taxName: "IVA",
    shipping: {
      standard: 25000,
      express: 45000,
      free_threshold: 300000,
    },
  },
  AR: {
    name: "Argentina",
    code: "AR",
    currency: "ARS",
    taxRate: 0.21, // IVA 21%
    taxName: "IVA",
    shipping: {
      standard: 2500,
      express: 5000,
      free_threshold: 50000,
    },
  },
  CL: {
    name: "Chile",
    code: "CL",
    currency: "CLP",
    taxRate: 0.19, // IVA 19%
    taxName: "IVA",
    shipping: {
      standard: 5000,
      express: 10000,
      free_threshold: 80000,
    },
  },
  CA: {
    name: "Canadá",
    code: "CA",
    currency: "CAD",
    taxRate: 0.13, // HST promedio ~13%
    taxName: "HST",
    shipping: {
      standard: 18,
      express: 40,
      free_threshold: 120,
    },
  },
  BR: {
    name: "Brasil",
    code: "BR",
    currency: "BRL",
    taxRate: 0.17, // ICMS promedio ~17%
    taxName: "ICMS",
    shipping: {
      standard: 35,
      express: 70,
      free_threshold: 400,
    },
  },
  PE: {
    name: "Perú",
    code: "PE",
    currency: "PEN",
    taxRate: 0.18, // IGV 18%
    taxName: "IGV",
    shipping: {
      standard: 25,
      express: 50,
      free_threshold: 350,
    },
  },
  GT: {
    name: "Guatemala",
    code: "GT",
    currency: "GTQ",
    taxRate: 0.12, // IVA 12%
    taxName: "IVA",
    shipping: {
      standard: 50,
      express: 100,
      free_threshold: 800,
    },
  },
};

// ===== OBJETO COUNTRY =====
const Country = {
  // Obtener tasas de cambio y símbolos
  getExchangeRates() {
    return exchangeRates;
  },

  getCurrencySymbols() {
    return currencySymbols;
  },

  // Normalizar código de moneda (convierte código de país a código de moneda si es necesario)
  normalizeCurrencyCode(code) {
    // Si ya es un código de moneda válido, devolverlo
    if (exchangeRates[code]) {
      return code;
    }
    // Si es un código de país, obtener su moneda
    if (countriesConfig[code]) {
      return countriesConfig[code].currency;
    }
    // Fallback a MXN
    return "MXN";
  },

  // Convertir precio de MXN a otra moneda
  convertPrice(priceInMXN, targetCurrency) {
    // Normalizar el código de moneda
    const normalizedCurrency = this.normalizeCurrencyCode(targetCurrency);
    const rate = exchangeRates[normalizedCurrency] || 1;
    return Math.round(priceInMXN * rate * 100) / 100;
  },

  // Convertir precio de otra moneda a MXN
  convertToMXN(priceInLocalCurrency, sourceCurrency) {
    // Normalizar el código de moneda
    const normalizedCurrency = this.normalizeCurrencyCode(sourceCurrency);
    const rate = exchangeRates[normalizedCurrency] || 1;
    if (rate === 0) return priceInLocalCurrency;
    return Math.round((priceInLocalCurrency / rate) * 100) / 100;
  },

  // Obtener símbolo de moneda
  getCurrencySymbol(currency) {
    const normalizedCurrency = this.normalizeCurrencyCode(currency);
    return currencySymbols[normalizedCurrency] || "$";
  },

  // Formatear precio con símbolo y moneda
  formatPrice(priceInMXN, countryCode) {
    const config = this.getCountryConfig(countryCode);
    const currency = config.currency;
    const symbol = currencySymbols[currency] || "$";
    const convertedPrice = this.convertPrice(priceInMXN, currency);
    return {
      original: priceInMXN,
      converted: convertedPrice,
      symbol: symbol,
      currency: currency,
      formatted: `${symbol}${convertedPrice.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currency}`,
    };
  },

  // Obtener todos los países disponibles
  getAllCountries() {
    return Object.values(countriesConfig).map((c) => ({
      code: c.code,
      name: c.name,
      currency: c.currency,
    }));
  },

  // Obtener configuración de un país (soporta código de país o moneda)
  getCountryConfig(countryCode) {
    // Mapeo de códigos de moneda a códigos de país (compatibilidad)
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

    // Si el código es de moneda, convertirlo a código de país
    const normalizedCode = currencyToCountry[countryCode] || countryCode;

    return countriesConfig[normalizedCode] || countriesConfig["MX"]; // Default México
  },

  // Calcular impuestos
  calculateTax(subtotal, countryCode) {
    const config = this.getCountryConfig(countryCode);
    const taxAmount = subtotal * config.taxRate;
    return {
      taxRate: config.taxRate,
      taxName: config.taxName,
      taxAmount: Math.round(taxAmount * 100) / 100,
    };
  },

  // Calcular envío
  // NOTA: subtotal viene en MXN (precio base de la BD)
  // Los costos de envío y thresholds están en moneda local
  // Todos los valores de retorno están en MXN para consistencia con el frontend
  calculateShipping(subtotal, countryCode, shippingType = "standard") {
    const config = this.getCountryConfig(countryCode);
    const shippingConfig = config.shipping;

    // Convertir subtotal de MXN a la moneda local para comparar con free_threshold
    const subtotalInLocalCurrency = this.convertPrice(
      subtotal,
      config.currency
    );

    // Verificar si aplica envío gratis (comparando en la misma moneda local)
    if (subtotalInLocalCurrency >= shippingConfig.free_threshold) {
      return {
        shippingCost: 0,
        shippingType: shippingType,
        isFree: true,
        freeThreshold: shippingConfig.free_threshold,
        currency: config.currency,
      };
    }

    // Costo de envío en moneda local
    const costInLocalCurrency =
      shippingType === "express"
        ? shippingConfig.express
        : shippingConfig.standard;

    // Convertir costo de envío a MXN para cálculos totales
    const shippingCostInMXN = this.convertToMXN(
      costInLocalCurrency,
      config.currency
    );

    // Calcular cuánto falta para envío gratis (en moneda local, luego a MXN)
    const amountNeededInLocal =
      shippingConfig.free_threshold - subtotalInLocalCurrency;
    const amountNeededInMXN = this.convertToMXN(
      amountNeededInLocal,
      config.currency
    );

    return {
      shippingCost: shippingCostInMXN,
      shippingType: shippingType,
      isFree: false,
      freeThreshold: shippingConfig.free_threshold,
      amountForFreeShipping: Math.max(
        0,
        Math.round(amountNeededInMXN * 100) / 100
      ),
      currency: config.currency,
    };
  },

  // Calcular totales completos
  calculateTotals(
    subtotal,
    countryCode,
    shippingType = "standard",
    discount = 0,
    giftWrap = false
  ) {
    const taxInfo = this.calculateTax(subtotal, countryCode);
    const shippingInfo = this.calculateShipping(
      subtotal,
      countryCode,
      shippingType
    );
    const giftWrapCost = giftWrap ? 20 : 0;

    const total =
      subtotal +
      taxInfo.taxAmount +
      shippingInfo.shippingCost +
      giftWrapCost -
      discount;

    return {
      subtotal: subtotal,
      tax: taxInfo,
      shipping: shippingInfo,
      giftWrap: giftWrapCost,
      discount: discount,
      total: Math.round(total * 100) / 100,
      currency: this.getCountryConfig(countryCode).currency,
    };
  },
};

// ===== EXPORTACIÓN DEL MODELO =====
module.exports = Country;
