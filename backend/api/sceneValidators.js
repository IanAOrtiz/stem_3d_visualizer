const TWO_PI = 2 * Math.PI;

export const PARAMETER_CONTROL_SPECS = {
  "harmonic_oscillator:v1": [
    { key: "amplitude", label: "Amplitude", min: 0.05, max: 10, step: 0.05, unit: "m", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "frequency", label: "Frequency", min: 0.05, max: 20, step: 0.05, unit: "Hz", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "phase", label: "Phase", min: -TWO_PI, max: TWO_PI, step: 0.01, unit: "rad", controlClass: "runtime_tunable", requiresValidation: false },
  ],
  "damped_oscillator:v1": [
    { key: "amplitude", label: "Amplitude", min: 0.05, max: 10, step: 0.05, unit: "m", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "frequency", label: "Frequency", min: 0.05, max: 20, step: 0.05, unit: "Hz", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "dampingRatio", label: "Damping Ratio", min: 0, max: 2, step: 0.01, controlClass: "runtime_tunable", requiresValidation: false },
    { key: "phase", label: "Phase", min: -TWO_PI, max: TWO_PI, step: 0.01, unit: "rad", controlClass: "runtime_tunable", requiresValidation: false },
  ],
  "driven_oscillator:v1": [
    { key: "amplitude", label: "Base Amplitude", min: 0.05, max: 10, step: 0.05, unit: "m", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "naturalFrequency", label: "Natural Frequency", min: 0.05, max: 20, step: 0.05, unit: "Hz", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "driveAmplitude", label: "Drive Amplitude", min: 0.01, max: 10, step: 0.01, unit: "m", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "driveFrequency", label: "Drive Frequency", min: 0.05, max: 20, step: 0.05, unit: "Hz", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "dampingRatio", label: "Damping Ratio", min: 0, max: 2, step: 0.01, controlClass: "runtime_tunable", requiresValidation: false },
    { key: "phase", label: "Phase", min: -TWO_PI, max: TWO_PI, step: 0.01, unit: "rad", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "drivePhase", label: "Drive Phase", min: -TWO_PI, max: TWO_PI, step: 0.01, unit: "rad", controlClass: "runtime_tunable", requiresValidation: false },
  ],
  "coupled_oscillators_2mass:v1": [
    { key: "mass", label: "Mass", min: 0.1, max: 20, step: 0.1, unit: "kg", controlClass: "plan_tunable", requiresValidation: true },
    { key: "anchorStiffness", label: "Anchor Stiffness", min: 0.1, max: 200, step: 0.1, unit: "N/m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "couplingStiffness", label: "Coupling Stiffness", min: 0.1, max: 200, step: 0.1, unit: "N/m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "amplitude1", label: "Amplitude 1", min: 0.01, max: 10, step: 0.01, unit: "m", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "amplitude2", label: "Amplitude 2", min: 0.01, max: 10, step: 0.01, unit: "m", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "phaseOffset", label: "Phase Offset", min: -TWO_PI, max: TWO_PI, step: 0.01, unit: "rad", controlClass: "runtime_tunable", requiresValidation: false },
  ],
  "projectile_motion:v1": [
    { key: "initialSpeed", label: "Initial Speed", min: 0.1, max: 200, step: 0.1, unit: "m/s", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "launchAngleDeg", label: "Launch Angle", min: 1, max: 89, step: 0.1, unit: "deg", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "gravity", label: "Gravity", min: 0.1, max: 50, step: 0.1, unit: "m/s^2", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "initialHeight", label: "Initial Height", min: 0, max: 200, step: 0.1, unit: "m", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "mass", label: "Mass", min: 0.1, max: 100, step: 0.1, unit: "kg", controlClass: "plan_tunable", requiresValidation: true },
    { key: "dragCoefficient", label: "Drag Coefficient", min: 0, max: 2, step: 0.01, controlClass: "runtime_tunable", requiresValidation: false },
  ],
  "uniform_circular_motion:v1": [
    { key: "radius", label: "Radius", min: 0.05, max: 50, step: 0.05, unit: "m", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "angularSpeed", label: "Angular Speed", min: 0.05, max: 50, step: 0.05, unit: "rad/s", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "phase", label: "Phase", min: -TWO_PI, max: TWO_PI, step: 0.01, unit: "rad", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "mass", label: "Mass", min: 0.1, max: 100, step: 0.1, unit: "kg", controlClass: "plan_tunable", requiresValidation: true },
  ],
  "kepler_two_body_orbit:v1": [
    { key: "semiMajorAxis", label: "Semi-Major Axis", min: 0.1, max: 500, step: 0.1, unit: "m", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "eccentricity", label: "Eccentricity", min: 0, max: 0.95, step: 0.001, controlClass: "runtime_tunable", requiresValidation: false },
    { key: "gravitationalParameter", label: "Mu", min: 0.01, max: 10000, step: 0.01, controlClass: "plan_tunable", requiresValidation: true },
    { key: "phase", label: "True Anomaly Offset", min: -TWO_PI, max: TWO_PI, step: 0.01, unit: "rad", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "inclinationDeg", label: "Inclination", min: 0, max: 180, step: 0.1, unit: "deg", controlClass: "runtime_tunable", requiresValidation: false },
  ],
  "laminar_internal_flow:v1": [
    { key: "length", label: "Length", min: 0.1, max: 100, step: 0.1, unit: "m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "hydraulicDiameter", label: "Hydraulic Diameter", min: 0.001, max: 10, step: 0.001, unit: "m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "pipeRadius", label: "Pipe Radius", min: 0.0005, max: 5, step: 0.0005, unit: "m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "pipeDiameter", label: "Pipe Diameter", min: 0.001, max: 10, step: 0.001, unit: "m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "channelWidth", label: "Channel Width", min: 0.001, max: 10, step: 0.001, unit: "m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "channelHeight", label: "Channel Height", min: 0.001, max: 10, step: 0.001, unit: "m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "rectangularWidth", label: "Rectangular Width", min: 0.001, max: 10, step: 0.001, unit: "m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "rectangularHeight", label: "Rectangular Height", min: 0.001, max: 10, step: 0.001, unit: "m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "annulusInnerDiameter", label: "Annulus Inner Diameter", min: 0.001, max: 10, step: 0.001, unit: "m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "annulusOuterDiameter", label: "Annulus Outer Diameter", min: 0.001, max: 20, step: 0.001, unit: "m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "density", label: "Density", min: 0.1, max: 5000, step: 0.1, unit: "kg/m^3", controlClass: "plan_tunable", requiresValidation: true },
    { key: "dynamicViscosity", label: "Dynamic Viscosity", min: 0.000001, max: 10, step: 0.000001, unit: "Pa.s", controlClass: "plan_tunable", requiresValidation: true },
    { key: "meanVelocity", label: "Mean Velocity", min: 0.001, max: 100, step: 0.001, unit: "m/s", controlClass: "runtime_tunable", requiresValidation: false },
    { key: "pressureGradient", label: "Pressure Gradient", min: -10000, max: 10000, step: 0.1, unit: "Pa/m", controlClass: "plan_tunable", requiresValidation: true },
    { key: "reynoldsNumber", label: "Reynolds Number", min: 0, max: 2200, step: 1, controlClass: "read_only", requiresValidation: false },
  ],
  "fluid_system:v1": [],
};

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function ensureFiniteNumber(name, value, errors) {
  if (!isFiniteNumber(value)) {
    errors.push(`${name} must be a finite number.`);
    return false;
  }
  return true;
}

function normalizeWithAliases(raw, aliasMap) {
  const canonical = {};
  const seen = new Set();

  for (const key of Object.keys(raw)) {
    const target = aliasMap[key];
    if (!target) {
      throw new Error(`Unknown parameter: "${key}". Allowed: ${Object.keys(aliasMap).join(", ")}`);
    }
    if (seen.has(target)) {
      throw new Error(`Duplicate mapping for "${target}" via key "${key}".`);
    }
    seen.add(target);
    canonical[target] = raw[key];
  }

  return canonical;
}

function validateHarmonic(rawParams) {
  const paramMap = {
    amplitude: "amplitude",
    A: "amplitude",
    frequency: "frequency",
    f: "frequency",
    phase: "phase",
  };
  const canonical = normalizeWithAliases(rawParams, paramMap);

  if (canonical.amplitude === undefined) {
    throw new Error('Missing required parameter: "amplitude" (or alias "A").');
  }
  if (canonical.frequency === undefined) {
    throw new Error('Missing required parameter: "frequency" (or alias "f").');
  }
  if (canonical.phase === undefined) {
    canonical.phase = 0;
  }

  const errors = [];
  ensureFiniteNumber("amplitude", canonical.amplitude, errors);
  ensureFiniteNumber("frequency", canonical.frequency, errors);
  ensureFiniteNumber("phase", canonical.phase, errors);

  if (errors.length === 0) {
    if (canonical.amplitude <= 0) errors.push(`amplitude must be > 0, got ${canonical.amplitude}.`);
    if (canonical.frequency <= 0) errors.push(`frequency must be > 0, got ${canonical.frequency}.`);
  }

  return { canonical, errors };
}

function validateDamped(rawParams) {
  const paramMap = {
    amplitude: "amplitude",
    A: "amplitude",
    frequency: "frequency",
    f: "frequency",
    dampingRatio: "dampingRatio",
    zeta: "dampingRatio",
    phase: "phase",
  };
  const canonical = normalizeWithAliases(rawParams, paramMap);

  if (canonical.amplitude === undefined) {
    throw new Error('Missing required parameter: "amplitude" (or alias "A").');
  }
  if (canonical.frequency === undefined) {
    throw new Error('Missing required parameter: "frequency" (or alias "f").');
  }
  if (canonical.dampingRatio === undefined) canonical.dampingRatio = 0.05;
  if (canonical.phase === undefined) canonical.phase = 0;

  const errors = [];
  ensureFiniteNumber("amplitude", canonical.amplitude, errors);
  ensureFiniteNumber("frequency", canonical.frequency, errors);
  ensureFiniteNumber("dampingRatio", canonical.dampingRatio, errors);
  ensureFiniteNumber("phase", canonical.phase, errors);

  if (errors.length === 0) {
    if (canonical.amplitude <= 0) errors.push(`amplitude must be > 0, got ${canonical.amplitude}.`);
    if (canonical.frequency <= 0) errors.push(`frequency must be > 0, got ${canonical.frequency}.`);
    if (canonical.dampingRatio < 0) errors.push(`dampingRatio must be >= 0, got ${canonical.dampingRatio}.`);
  }

  return { canonical, errors };
}

function validateDriven(rawParams) {
  const paramMap = {
    amplitude: "amplitude",
    A: "amplitude",
    naturalFrequency: "naturalFrequency",
    fn: "naturalFrequency",
    driveAmplitude: "driveAmplitude",
    Ad: "driveAmplitude",
    driveFrequency: "driveFrequency",
    fd: "driveFrequency",
    dampingRatio: "dampingRatio",
    zeta: "dampingRatio",
    phase: "phase",
    drivePhase: "drivePhase",
  };
  const canonical = normalizeWithAliases(rawParams, paramMap);

  if (canonical.amplitude === undefined) {
    throw new Error('Missing required parameter: "amplitude" (or alias "A").');
  }
  if (canonical.naturalFrequency === undefined) {
    throw new Error('Missing required parameter: "naturalFrequency" (or alias "fn").');
  }
  if (canonical.driveAmplitude === undefined) canonical.driveAmplitude = canonical.amplitude;
  if (canonical.driveFrequency === undefined) canonical.driveFrequency = canonical.naturalFrequency;
  if (canonical.dampingRatio === undefined) canonical.dampingRatio = 0.05;
  if (canonical.phase === undefined) canonical.phase = 0;
  if (canonical.drivePhase === undefined) canonical.drivePhase = 0;

  const errors = [];
  for (const key of ["amplitude", "naturalFrequency", "driveAmplitude", "driveFrequency", "dampingRatio", "phase", "drivePhase"]) {
    ensureFiniteNumber(key, canonical[key], errors);
  }

  if (errors.length === 0) {
    if (canonical.amplitude <= 0) errors.push(`amplitude must be > 0, got ${canonical.amplitude}.`);
    if (canonical.naturalFrequency <= 0) errors.push(`naturalFrequency must be > 0, got ${canonical.naturalFrequency}.`);
    if (canonical.driveAmplitude <= 0) errors.push(`driveAmplitude must be > 0, got ${canonical.driveAmplitude}.`);
    if (canonical.driveFrequency <= 0) errors.push(`driveFrequency must be > 0, got ${canonical.driveFrequency}.`);
    if (canonical.dampingRatio < 0) errors.push(`dampingRatio must be >= 0, got ${canonical.dampingRatio}.`);
  }

  return { canonical, errors };
}

function validateCoupled(rawParams) {
  const paramMap = {
    mass: "mass",
    m: "mass",
    anchorStiffness: "anchorStiffness",
    kAnchor: "anchorStiffness",
    couplingStiffness: "couplingStiffness",
    kCoupling: "couplingStiffness",
    amplitude1: "amplitude1",
    A1: "amplitude1",
    amplitude2: "amplitude2",
    A2: "amplitude2",
    phaseOffset: "phaseOffset",
    deltaPhase: "phaseOffset",
  };
  const canonical = normalizeWithAliases(rawParams, paramMap);

  if (canonical.mass === undefined) canonical.mass = 1;
  if (canonical.anchorStiffness === undefined) throw new Error('Missing required parameter: "anchorStiffness" (or alias "kAnchor").');
  if (canonical.couplingStiffness === undefined) throw new Error('Missing required parameter: "couplingStiffness" (or alias "kCoupling").');
  if (canonical.amplitude1 === undefined) throw new Error('Missing required parameter: "amplitude1" (or alias "A1").');
  if (canonical.amplitude2 === undefined) canonical.amplitude2 = canonical.amplitude1;
  if (canonical.phaseOffset === undefined) canonical.phaseOffset = 0;

  const errors = [];
  for (const key of ["mass", "anchorStiffness", "couplingStiffness", "amplitude1", "amplitude2", "phaseOffset"]) {
    ensureFiniteNumber(key, canonical[key], errors);
  }

  if (errors.length === 0) {
    if (canonical.mass <= 0) errors.push(`mass must be > 0, got ${canonical.mass}.`);
    if (canonical.anchorStiffness <= 0) errors.push(`anchorStiffness must be > 0, got ${canonical.anchorStiffness}.`);
    if (canonical.couplingStiffness <= 0) errors.push(`couplingStiffness must be > 0, got ${canonical.couplingStiffness}.`);
    if (canonical.amplitude1 <= 0) errors.push(`amplitude1 must be > 0, got ${canonical.amplitude1}.`);
    if (canonical.amplitude2 <= 0) errors.push(`amplitude2 must be > 0, got ${canonical.amplitude2}.`);
  }

  return { canonical, errors };
}

function validateProjectile(rawParams) {
  const paramMap = {
    initialSpeed: "initialSpeed",
    v0: "initialSpeed",
    launchAngleDeg: "launchAngleDeg",
    thetaDeg: "launchAngleDeg",
    gravity: "gravity",
    g: "gravity",
    initialHeight: "initialHeight",
    h0: "initialHeight",
    mass: "mass",
    m: "mass",
    dragCoefficient: "dragCoefficient",
    cd: "dragCoefficient",
  };
  const canonical = normalizeWithAliases(rawParams, paramMap);

  if (canonical.initialSpeed === undefined) throw new Error('Missing required parameter: "initialSpeed" (or alias "v0").');
  if (canonical.launchAngleDeg === undefined) throw new Error('Missing required parameter: "launchAngleDeg" (or alias "thetaDeg").');
  if (canonical.gravity === undefined) canonical.gravity = 9.81;
  if (canonical.initialHeight === undefined) canonical.initialHeight = 0;
  if (canonical.mass === undefined) canonical.mass = 1;
  if (canonical.dragCoefficient === undefined) canonical.dragCoefficient = 0;

  const errors = [];
  for (const key of ["initialSpeed", "launchAngleDeg", "gravity", "initialHeight", "mass", "dragCoefficient"]) {
    ensureFiniteNumber(key, canonical[key], errors);
  }

  if (errors.length === 0) {
    if (canonical.initialSpeed <= 0) errors.push(`initialSpeed must be > 0, got ${canonical.initialSpeed}.`);
    if (!(canonical.launchAngleDeg > 0 && canonical.launchAngleDeg < 90)) {
      errors.push(`launchAngleDeg must be in (0, 90), got ${canonical.launchAngleDeg}.`);
    }
    if (canonical.gravity <= 0) errors.push(`gravity must be > 0, got ${canonical.gravity}.`);
    if (canonical.initialHeight < 0) errors.push(`initialHeight must be >= 0, got ${canonical.initialHeight}.`);
    if (canonical.mass <= 0) errors.push(`mass must be > 0, got ${canonical.mass}.`);
    if (canonical.dragCoefficient < 0) errors.push(`dragCoefficient must be >= 0, got ${canonical.dragCoefficient}.`);
  }

  return { canonical, errors };
}

function validateUniformCircular(rawParams) {
  const paramMap = {
    radius: "radius",
    r: "radius",
    angularSpeed: "angularSpeed",
    omega: "angularSpeed",
    phase: "phase",
    mass: "mass",
    m: "mass",
    plane: "plane",
  };
  const canonical = normalizeWithAliases(rawParams, paramMap);

  if (canonical.radius === undefined) throw new Error('Missing required parameter: "radius" (or alias "r").');
  if (canonical.angularSpeed === undefined) throw new Error('Missing required parameter: "angularSpeed" (or alias "omega").');
  if (canonical.phase === undefined) canonical.phase = 0;
  if (canonical.mass === undefined) canonical.mass = 1;
  if (canonical.plane === undefined) canonical.plane = "xy";

  const errors = [];
  for (const key of ["radius", "angularSpeed", "phase", "mass"]) {
    ensureFiniteNumber(key, canonical[key], errors);
  }

  if (!["xy", "xz", "yz"].includes(canonical.plane)) {
    errors.push(`plane must be one of: xy, xz, yz. Got "${canonical.plane}".`);
  }

  if (errors.length === 0) {
    if (canonical.radius <= 0) errors.push(`radius must be > 0, got ${canonical.radius}.`);
    if (canonical.angularSpeed <= 0) errors.push(`angularSpeed must be > 0, got ${canonical.angularSpeed}.`);
    if (canonical.mass <= 0) errors.push(`mass must be > 0, got ${canonical.mass}.`);
  }

  return { canonical, errors };
}

function validateKepler(rawParams) {
  const paramMap = {
    semiMajorAxis: "semiMajorAxis",
    a: "semiMajorAxis",
    eccentricity: "eccentricity",
    e: "eccentricity",
    gravitationalParameter: "gravitationalParameter",
    mu: "gravitationalParameter",
    phase: "phase",
    inclinationDeg: "inclinationDeg",
    inclination: "inclinationDeg",
  };
  const canonical = normalizeWithAliases(rawParams, paramMap);

  if (canonical.semiMajorAxis === undefined) throw new Error('Missing required parameter: "semiMajorAxis" (or alias "a").');
  if (canonical.eccentricity === undefined) throw new Error('Missing required parameter: "eccentricity" (or alias "e").');
  if (canonical.gravitationalParameter === undefined) throw new Error('Missing required parameter: "gravitationalParameter" (or alias "mu").');
  if (canonical.phase === undefined) canonical.phase = 0;
  if (canonical.inclinationDeg === undefined) canonical.inclinationDeg = 0;

  const errors = [];
  for (const key of ["semiMajorAxis", "eccentricity", "gravitationalParameter", "phase", "inclinationDeg"]) {
    ensureFiniteNumber(key, canonical[key], errors);
  }

  if (errors.length === 0) {
    if (canonical.semiMajorAxis <= 0) errors.push(`semiMajorAxis must be > 0, got ${canonical.semiMajorAxis}.`);
    if (canonical.eccentricity < 0 || canonical.eccentricity >= 1) {
      errors.push(`eccentricity must satisfy 0 <= e < 1, got ${canonical.eccentricity}.`);
    }
    if (canonical.gravitationalParameter <= 0) {
      errors.push(`gravitationalParameter must be > 0, got ${canonical.gravitationalParameter}.`);
    }
    if (canonical.inclinationDeg < 0 || canonical.inclinationDeg > 180) {
      errors.push(`inclinationDeg must be in [0, 180], got ${canonical.inclinationDeg}.`);
    }
  }

  return { canonical, errors };
}

function deriveLaminarHydraulicDiameter(canonical) {
  if (canonical.geometryType === "pipe") {
    if (canonical.pipeRadius !== undefined) {
      canonical.pipeDiameter = 2 * canonical.pipeRadius;
      canonical.hydraulicDiameter = canonical.pipeDiameter;
      return;
    }
    if (canonical.pipeDiameter !== undefined) {
      canonical.pipeRadius = canonical.pipeDiameter / 2;
      canonical.hydraulicDiameter = canonical.pipeDiameter;
      return;
    }
    if (canonical.hydraulicDiameter !== undefined) {
      canonical.pipeDiameter = canonical.hydraulicDiameter;
      canonical.pipeRadius = canonical.hydraulicDiameter / 2;
      return;
    }
    throw new Error('Pipe geometry requires one of: "pipeRadius", "pipeDiameter", or "hydraulicDiameter".');
  }

  if (canonical.geometryType === "annulus") {
    const inner = canonical.annulusInnerDiameter;
    const outer = canonical.annulusOuterDiameter;
    if (inner !== undefined && outer !== undefined) {
      canonical.hydraulicDiameter = outer - inner;
      return;
    }
    if (canonical.hydraulicDiameter !== undefined) {
      return;
    }
    throw new Error('Annulus geometry requires "annulusInnerDiameter" + "annulusOuterDiameter", or explicit "hydraulicDiameter".');
  }

  if (canonical.geometryType === "channel") {
    const width = canonical.channelWidth;
    const height = canonical.channelHeight;
    if (width !== undefined && height !== undefined) {
      canonical.hydraulicDiameter = (2 * width * height) / (width + height);
      return;
    }
    if (canonical.hydraulicDiameter !== undefined) {
      return;
    }
    throw new Error('Channel geometry requires "channelWidth" + "channelHeight", or explicit "hydraulicDiameter".');
  }

  if (canonical.geometryType === "rectangular_duct") {
    const width = canonical.rectangularWidth;
    const height = canonical.rectangularHeight;
    if (width !== undefined && height !== undefined) {
      canonical.hydraulicDiameter = (2 * width * height) / (width + height);
      return;
    }
    throw new Error('Rectangular duct geometry requires "rectangularWidth" and "rectangularHeight".');
  }
}

function validateLaminar(rawParams) {
  const paramMap = {
    geometryType: "geometryType",
    length: "length",
    L: "length",
    hydraulicDiameter: "hydraulicDiameter",
    Dh: "hydraulicDiameter",
    pipeRadius: "pipeRadius",
    radius: "pipeRadius",
    r: "pipeRadius",
    pipeDiameter: "pipeDiameter",
    diameter: "pipeDiameter",
    D: "pipeDiameter",
    channelWidth: "channelWidth",
    channelHeight: "channelHeight",
    rectangularWidth: "rectangularWidth",
    rectangularHeight: "rectangularHeight",
    annulusInnerDiameter: "annulusInnerDiameter",
    innerDiameter: "annulusInnerDiameter",
    annulusOuterDiameter: "annulusOuterDiameter",
    outerDiameter: "annulusOuterDiameter",
    density: "density",
    rho: "density",
    dynamicViscosity: "dynamicViscosity",
    mu: "dynamicViscosity",
    reynoldsNumber: "reynoldsNumber",
    Re: "reynoldsNumber",
    drivingMechanism: "drivingMechanism",
    meanVelocity: "meanVelocity",
    U: "meanVelocity",
    pressureGradient: "pressureGradient",
    dPdx: "pressureGradient",
    transient: "transient",
    thermalConductivity: "thermalConductivity",
    specificHeat: "specificHeat",
  };
  const canonical = normalizeWithAliases(rawParams, paramMap);

  if (canonical.geometryType === undefined) canonical.geometryType = "pipe";
  if (canonical.length === undefined) throw new Error('Missing required parameter: "length" (or alias "L").');
  deriveLaminarHydraulicDiameter(canonical);
  if (canonical.density === undefined) throw new Error('Missing required parameter: "density" (or alias "rho").');
  if (canonical.dynamicViscosity === undefined) throw new Error('Missing required parameter: "dynamicViscosity" (or alias "mu").');
  if (canonical.reynoldsNumber === undefined) throw new Error('Missing required parameter: "reynoldsNumber" (or alias "Re").');
  if (canonical.drivingMechanism === undefined) canonical.drivingMechanism = "velocity-driven";
  if (canonical.transient === undefined) canonical.transient = false;

  const errors = [];
  for (const key of ["length", "hydraulicDiameter", "density", "dynamicViscosity", "reynoldsNumber"]) {
    ensureFiniteNumber(key, canonical[key], errors);
  }
  if (canonical.meanVelocity !== undefined) ensureFiniteNumber("meanVelocity", canonical.meanVelocity, errors);
  if (canonical.pressureGradient !== undefined) ensureFiniteNumber("pressureGradient", canonical.pressureGradient, errors);
  if (canonical.thermalConductivity !== undefined) ensureFiniteNumber("thermalConductivity", canonical.thermalConductivity, errors);
  if (canonical.specificHeat !== undefined) ensureFiniteNumber("specificHeat", canonical.specificHeat, errors);
  if (canonical.pipeRadius !== undefined) ensureFiniteNumber("pipeRadius", canonical.pipeRadius, errors);
  if (canonical.pipeDiameter !== undefined) ensureFiniteNumber("pipeDiameter", canonical.pipeDiameter, errors);
  if (canonical.channelWidth !== undefined) ensureFiniteNumber("channelWidth", canonical.channelWidth, errors);
  if (canonical.channelHeight !== undefined) ensureFiniteNumber("channelHeight", canonical.channelHeight, errors);
  if (canonical.rectangularWidth !== undefined) ensureFiniteNumber("rectangularWidth", canonical.rectangularWidth, errors);
  if (canonical.rectangularHeight !== undefined) ensureFiniteNumber("rectangularHeight", canonical.rectangularHeight, errors);
  if (canonical.annulusInnerDiameter !== undefined) ensureFiniteNumber("annulusInnerDiameter", canonical.annulusInnerDiameter, errors);
  if (canonical.annulusOuterDiameter !== undefined) ensureFiniteNumber("annulusOuterDiameter", canonical.annulusOuterDiameter, errors);

  if (!["pipe", "channel", "rectangular_duct", "annulus"].includes(canonical.geometryType)) {
    errors.push(`geometryType must be one of: pipe, channel, rectangular_duct, annulus. Got "${canonical.geometryType}".`);
  }
  if (!["velocity-driven", "pressure-driven"].includes(canonical.drivingMechanism)) {
    errors.push(`drivingMechanism must be one of: velocity-driven, pressure-driven. Got "${canonical.drivingMechanism}".`);
  }
  if (typeof canonical.transient !== "boolean") {
    errors.push("transient must be a boolean.");
  }

  if (errors.length === 0) {
    if (canonical.length <= 0) errors.push(`length must be > 0, got ${canonical.length}.`);
    if (canonical.hydraulicDiameter <= 0) errors.push(`hydraulicDiameter must be > 0, got ${canonical.hydraulicDiameter}.`);
    if (canonical.density <= 0) errors.push(`density must be > 0, got ${canonical.density}.`);
    if (canonical.dynamicViscosity <= 0) errors.push(`dynamicViscosity must be > 0, got ${canonical.dynamicViscosity}.`);
    if (canonical.reynoldsNumber < 0) errors.push(`reynoldsNumber must be >= 0, got ${canonical.reynoldsNumber}.`);
    if (canonical.reynoldsNumber >= 2300) {
      errors.push(`laminar_internal_flow requires Reynolds number < 2300, got ${canonical.reynoldsNumber}.`);
    }
    if (canonical.geometryType === "annulus") {
      if (canonical.annulusInnerDiameter === undefined || canonical.annulusOuterDiameter === undefined) {
        errors.push('Annulus geometry requires both "annulusInnerDiameter" and "annulusOuterDiameter".');
      } else if (canonical.annulusOuterDiameter <= canonical.annulusInnerDiameter) {
        errors.push(`Annulus geometry requires annulusOuterDiameter > annulusInnerDiameter (got ${canonical.annulusOuterDiameter} <= ${canonical.annulusInnerDiameter}).`);
      }
    }
    if (canonical.geometryType === "rectangular_duct") {
      if (canonical.rectangularWidth === undefined || canonical.rectangularHeight === undefined) {
        errors.push('Rectangular duct geometry requires both "rectangularWidth" and "rectangularHeight".');
      }
    }

    if (canonical.drivingMechanism === "velocity-driven") {
      if (canonical.meanVelocity === undefined || canonical.meanVelocity <= 0) {
        errors.push('velocity-driven flow requires "meanVelocity" > 0.');
      }
      if (canonical.pressureGradient !== undefined) {
        errors.push('velocity-driven flow must not set "pressureGradient".');
      }
    }

    if (canonical.drivingMechanism === "pressure-driven") {
      if (canonical.pressureGradient === undefined || canonical.pressureGradient === 0) {
        errors.push('pressure-driven flow requires non-zero "pressureGradient".');
      }
      if (canonical.meanVelocity !== undefined) {
        errors.push('pressure-driven flow must not set "meanVelocity".');
      }
    }
  }

  return { canonical, errors };
}

function validateFluidSystem(rawParams) {
  const paramMap = {
    geometry: "geometry",
    fluidProperties: "fluidProperties",
    flowConfiguration: "flowConfiguration",
    flowRegime: "flowRegime",
  };
  const canonical = normalizeWithAliases(rawParams, paramMap);

  if (!canonical.geometry) throw new Error('Missing required parameter: "geometry".');
  if (!canonical.fluidProperties) throw new Error('Missing required parameter: "fluidProperties".');
  if (!canonical.flowConfiguration) throw new Error('Missing required parameter: "flowConfiguration".');
  if (!canonical.flowRegime) throw new Error('Missing required parameter: "flowRegime".');

  const errors = [];

  if (!canonical.geometry || typeof canonical.geometry !== "object") {
    errors.push("geometry must be an object.");
  }
  if (!canonical.fluidProperties || typeof canonical.fluidProperties !== "object") {
    errors.push("fluidProperties must be an object.");
  }
  if (!canonical.flowConfiguration || typeof canonical.flowConfiguration !== "object") {
    errors.push("flowConfiguration must be an object.");
  }
  if (!canonical.flowRegime || typeof canonical.flowRegime !== "object") {
    errors.push("flowRegime must be an object.");
  }

  if (errors.length === 0) {
    const fp = canonical.fluidProperties;
    if (!isFiniteNumber(fp.density) || fp.density <= 0) {
      errors.push("fluidProperties.density must be a finite number > 0.");
    }
    if (!isFiniteNumber(fp.dynamicViscosity) || fp.dynamicViscosity <= 0) {
      errors.push("fluidProperties.dynamicViscosity must be a finite number > 0.");
    }

    const fr = canonical.flowRegime;
    if (!isFiniteNumber(fr.reynoldsNumber) || fr.reynoldsNumber < 0) {
      errors.push("flowRegime.reynoldsNumber must be a finite number >= 0.");
    }
    if (!["laminar", "transitional", "turbulent"].includes(fr.regimeType)) {
      errors.push('flowRegime.regimeType must be "laminar", "transitional", or "turbulent".');
    }
    if (fr.turbulenceModel !== undefined && fr.regimeType !== "turbulent") {
      errors.push('turbulenceModel is only allowed when regimeType is "turbulent".');
    }
    if (fr.regimeType === "laminar" && fr.turbulenceModel !== undefined) {
      errors.push("Laminar regime must not include turbulenceModel.");
    }

    const fc = canonical.flowConfiguration;
    if (!["pressure-driven", "velocity-driven"].includes(fc.drivingMechanism)) {
      errors.push('flowConfiguration.drivingMechanism must be "pressure-driven" or "velocity-driven".');
    }
    const hasInletVelocity = fc.inletVelocity !== undefined;
    const hasPressureGradient = fc.pressureGradient !== undefined;
    if (hasInletVelocity === hasPressureGradient) {
      errors.push('Provide exactly one of "inletVelocity" or "pressureGradient".');
    }
    if (fc.drivingMechanism === "velocity-driven" && fc.inletVelocity === undefined) {
      errors.push('velocity-driven flow requires "inletVelocity".');
    }
    if (fc.drivingMechanism === "pressure-driven" && fc.pressureGradient === undefined) {
      errors.push('pressure-driven flow requires "pressureGradient".');
    }
  }

  return { canonical, errors };
}

const CONCEPT_VALIDATORS = {
  harmonic_oscillator: validateHarmonic,
  damped_oscillator: validateDamped,
  driven_oscillator: validateDriven,
  coupled_oscillators_2mass: validateCoupled,
  projectile_motion: validateProjectile,
  uniform_circular_motion: validateUniformCircular,
  kepler_two_body_orbit: validateKepler,
  laminar_internal_flow: validateLaminar,
  fluid_system: validateFluidSystem,
};

export function validateScenePlanPayload(scenePlan) {
  if (!scenePlan || typeof scenePlan !== "object") {
    return { valid: false, errors: ["scenePlan must be a non-null object."] };
  }

  const concept = scenePlan.concept;
  const schemaVersion = scenePlan.schemaVersion;
  const errors = [];

  if (!concept || typeof concept !== "string") {
    errors.push('Missing or invalid "concept" field.');
  }
  if (!schemaVersion || typeof schemaVersion !== "string") {
    errors.push('Missing or invalid "schemaVersion" field.');
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const validator = CONCEPT_VALIDATORS[concept];
  if (!validator) {
    return {
      valid: false,
      errors: [`Unknown concept: "${concept}". Registered concepts: ${Object.keys(CONCEPT_VALIDATORS).join(", ")}.`],
    };
  }

  if (schemaVersion !== "v1") {
    return {
      valid: false,
      errors: [`Unknown schemaVersion: "${schemaVersion}" for concept "${concept}". Only "v1" is registered.`],
    };
  }

  let canonical;
  try {
    const result = validator(scenePlan.parameters || {});
    canonical = result.canonical;
    if (result.errors.length > 0) {
      return { valid: false, errors: result.errors };
    }
  } catch (error) {
    return { valid: false, errors: [`Normalization failed: ${error.message}`] };
  }

  const specKey = `${concept}:${schemaVersion}`;
  return {
    valid: true,
    errors: [],
    canonicalScenePlan: {
      concept,
      schemaVersion,
      parameters: canonical,
      parameterControlSpecs: PARAMETER_CONTROL_SPECS[specKey] || [],
    },
  };
}
