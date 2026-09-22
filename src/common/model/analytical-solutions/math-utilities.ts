/**
 * Mathematical utility functions for analytical solutions.
 * These are used by various potential solvers for special functions and polynomials.
 */

/**
 * Calculate factorial n!
 */
export function factorial(n: number): number {
  if (n <= 1) {
    return 1;
  }
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Calculate the Hermite polynomial H_n(x) using recurrence relation.
 * H_0(x) = 1
 * H_1(x) = 2x
 * H_(n+1)(x) = 2x*H_n(x) - 2n*H_(n-1)(x)
 */
export function hermitePolynomial(n: number, x: number): number {
  if (n === 0) {
    return 1;
  }
  if (n === 1) {
    return 2 * x;
  }

  let HPrev = 1;
  let HCurr = 2 * x;

  for (let i = 1; i < n; i++) {
    const HNext = 2 * x * HCurr - 2 * i * HPrev;
    HPrev = HCurr;
    HCurr = HNext;
  }

  return HCurr;
}

/**
 * Calculate the associated Laguerre polynomial L_n^α(x) using recurrence relation.
 */
export function associatedLaguerre(n: number, alpha: number, x: number): number {
  if (n === 0) {
    return 1;
  }
  if (n === 1) {
    return 1 + alpha - x;
  }

  let LPrev = 1;
  let LCurr = 1 + alpha - x;

  for (let k = 1; k < n; k++) {
    const LNext = ((2 * k + 1 + alpha - x) * LCurr - (k + alpha) * LPrev) / (k + 1);
    LPrev = LCurr;
    LCurr = LNext;
  }

  return LCurr;
}

/**
 * Calculate the Jacobi polynomial P_n^(α,β)(x) using recurrence relation.
 */
export function jacobiPolynomial(n: number, alpha: number, beta: number, x: number): number {
  if (n === 0) {
    return 1;
  }
  if (n === 1) {
    return 0.5 * (alpha - beta + (alpha + beta + 2) * x);
  }

  let PPrev = 1;
  let PCurr = 0.5 * (alpha - beta + (alpha + beta + 2) * x);

  for (let k = 1; k < n; k++) {
    const a1 = 2 * (k + 1) * (k + alpha + beta + 1) * (2 * k + alpha + beta);
    const a2 = (2 * k + alpha + beta + 1) * (alpha * alpha - beta * beta);
    const a3 = (2 * k + alpha + beta) * (2 * k + alpha + beta + 1) * (2 * k + alpha + beta + 2);
    const a4 = 2 * (k + alpha) * (k + beta) * (2 * k + alpha + beta + 2);

    const PNext = ((a2 + a3 * x) * PCurr - a4 * PPrev) / a1;
    PPrev = PCurr;
    PCurr = PNext;
  }

  return PCurr;
}

/**
 * Gamma function using Lanczos approximation for high accuracy.
 * This provides ~15 digits of precision for positive real arguments.
 */
export function gamma(n: number): number {
  // Handle special cases
  if (n <= 0 && n === Math.floor(n)) {
    return Infinity; // Poles at non-positive integers
  }

  // For small positive integers, use factorial
  if (n === Math.floor(n) && n > 0 && n <= 20) {
    return factorial(n - 1);
  }

  // Lanczos approximation coefficients (g=7, n=9)
  const g = 7;
  const coefficients = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  // Use reflection formula for n < 0.5
  if (n < 0.5) {
    return Math.PI / (Math.sin(Math.PI * n) * gamma(1 - n));
  }

  const x = n - 1;
  let a = coefficients[0]!;
  for (let i = 1; i < coefficients.length; i++) {
    a += coefficients[i]! / (x + i);
  }

  const t = x + g + 0.5;
  return Math.sqrt(2 * Math.PI) * t ** (x + 0.5) * Math.exp(-t) * a;
}

/**
 * Log-gamma function for better numerical stability.
 * Uses Stirling's series with Bernoulli number corrections for high accuracy.
 */
export function logGamma(x: number): number {
  if (x <= 0) {
    throw new Error("logGamma undefined for non-positive arguments");
  }

  // For small integers, use log(factorial)
  if (x === Math.floor(x) && x < 20) {
    return Math.log(factorial(x - 1));
  }

  // For small x, use recurrence relation to shift to larger values
  // logGamma(x) = logGamma(x+1) - log(x)
  if (x < 7) {
    return logGamma(x + 1) - Math.log(x);
  }

  // Stirling's series with Bernoulli number corrections:
  // log(Γ(x)) ≈ (x-0.5)*log(x) - x + 0.5*log(2π) + Σ B_{2k}/(2k(2k-1)x^{2k-1})
  // Bernoulli coefficients: B_2/2 = 1/12, B_4/12 = -1/360, B_6/30 = 1/1260, etc.
  const x2 = x * x;
  const x4 = x2 * x2;
  const x6 = x4 * x2;
  const x8 = x6 * x2;
  const x10 = x8 * x2;
  const x12 = x10 * x2;

  // Coefficients from Bernoulli numbers: B_{2k}/(2k*(2k-1))
  const correction =
    1 / (12 * x) - // B_2/(1*2) = 1/12
    1 / (360 * x2 * x) + // B_4/(3*4) = -1/360
    1 / (1260 * x4 * x) - // B_6/(5*6) = 1/1260
    1 / (1680 * x6 * x) + // B_8/(7*8) = -1/1680
    1 / (1188 * x8 * x) - // B_10/(9*10) = 1/1188 (approx 5/5940)
    691 / (360360 * x10 * x) + // B_12/(11*12) = -691/360360
    1 / (156 * x12 * x); // B_14/(13*14) = 1/156 (approx 7/1092)

  return (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI) + correction;
}

/**
 * Airy function Ai(x) using series expansion for small |x| and asymptotic form for large |x|.
 * Ai(x) is the solution to y'' - xy = 0 that decays exponentially for large positive x.
 */
export function airyAi(x: number): number {
  const ABS_X_THRESHOLD = 3.0;

  if (Math.abs(x) < ABS_X_THRESHOLD) {
    // Series expansion for small |x|
    // Ai(x) = c1 * (1 + x^3/(2*3) + x^6/(2*3*5*6) + ...) - c2 * (x + x^4/(3*4) + x^7/(3*4*6*7) + ...)
    // where c1 = 1/(3^(2/3)*Γ(2/3)), c2 = 1/(3^(1/3)*Γ(1/3))
    const c1 = 0.3550280538878172; // 1/(3^(2/3)*Γ(2/3))
    const c2 = 0.2588194037928068; // 1/(3^(1/3)*Γ(1/3))

    let term1 = 1.0;
    let sum1 = 1.0;
    for (let k = 1; k <= 20; k++) {
      term1 *= (x * x * x) / ((3 * k - 1) * (3 * k));
      sum1 += term1;
      if (Math.abs(term1) < 1e-15) {
        break;
      }
    }

    let term2 = x;
    let sum2 = x;
    for (let k = 1; k <= 20; k++) {
      term2 *= (x * x * x) / (3 * k * (3 * k + 1));
      sum2 += term2;
      if (Math.abs(term2) < 1e-15) {
        break;
      }
    }

    return c1 * sum1 - c2 * sum2;
  } else if (x > 0) {
    // Asymptotic expansion for large positive x
    // Ai(x) ≈ (1/(2√π)) * x^(-1/4) * exp(-ζ) * (1 - ...)
    // where ζ = (2/3) * x^(3/2)
    const zeta = (2.0 / 3.0) * x ** 1.5;
    const factor = (0.5 / Math.sqrt(Math.PI)) * x ** -0.25;
    return factor * Math.exp(-zeta);
  } else {
    // Asymptotic expansion for large negative x
    // Ai(x) ≈ (1/√π) * |x|^(-1/4) * sin(ζ + π/4)
    // where ζ = (2/3) * |x|^(3/2)
    const absX = Math.abs(x);
    const zeta = (2.0 / 3.0) * absX ** 1.5;
    const factor = (1.0 / Math.sqrt(Math.PI)) * absX ** -0.25;
    return factor * Math.sin(zeta + Math.PI / 4);
  }
}

/**
 * Airy function Bi(x) using series expansion for small |x| and asymptotic form for large |x|.
 * Bi(x) is the solution to y'' - xy = 0 that grows exponentially for large positive x.
 */
export function airyBi(x: number): number {
  const ABS_X_THRESHOLD = 3.0;

  if (Math.abs(x) < ABS_X_THRESHOLD) {
    // Series expansion for small |x|
    // Bi(x) = c3 * (1 + x^3/(2*3) + x^6/(2*3*5*6) + ...) + c4 * (x + x^4/(3*4) + x^7/(3*4*6*7) + ...)
    // where c3 = 1/(3^(1/6)*Γ(2/3)), c4 = 3^(1/6)/Γ(1/3)
    const c3 = 0.6149266274460007; // 1/(3^(1/6)*Γ(2/3))
    const c4 = 0.4482883573538264; // 3^(1/6)/Γ(1/3)

    let term1 = 1.0;
    let sum1 = 1.0;
    for (let k = 1; k <= 20; k++) {
      term1 *= (x * x * x) / ((3 * k - 1) * (3 * k));
      sum1 += term1;
      if (Math.abs(term1) < 1e-15) {
        break;
      }
    }

    let term2 = x;
    let sum2 = x;
    for (let k = 1; k <= 20; k++) {
      term2 *= (x * x * x) / (3 * k * (3 * k + 1));
      sum2 += term2;
      if (Math.abs(term2) < 1e-15) {
        break;
      }
    }

    return c3 * sum1 + c4 * sum2;
  } else if (x > 0) {
    // Asymptotic expansion for large positive x
    // Bi(x) ≈ (1/√π) * x^(-1/4) * exp(ζ)
    // where ζ = (2/3) * x^(3/2)
    const zeta = (2.0 / 3.0) * x ** 1.5;
    const factor = (1.0 / Math.sqrt(Math.PI)) * x ** -0.25;
    return factor * Math.exp(zeta);
  } else {
    // Asymptotic expansion for large negative x
    // Bi(x) ≈ (1/√π) * |x|^(-1/4) * cos(ζ + π/4)
    // where ζ = (2/3) * |x|^(3/2)
    const absX = Math.abs(x);
    const zeta = (2.0 / 3.0) * absX ** 1.5;
    const factor = (1.0 / Math.sqrt(Math.PI)) * absX ** -0.25;
    return factor * Math.cos(zeta + Math.PI / 4);
  }
}

/**
 * Derivative of Airy function Ai'(x) using numerical differentiation.
 */
export function airyAiPrime(x: number): number {
  const h = 1e-6;
  return (airyAi(x + h) - airyAi(x - h)) / (2 * h);
}

/**
 * Derivative of Airy function Bi'(x) using numerical differentiation.
 */
export function airyBiPrime(x: number): number {
  const h = 1e-6;
  return (airyBi(x + h) - airyBi(x - h)) / (2 * h);
}
