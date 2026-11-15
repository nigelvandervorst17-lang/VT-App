/** Independent procedure-control model. Contains NO exposure physics or curve data. */
export type SourceType = 'Se-75' | 'Ir-192' | 'X-ray';
export type FilmType = 'D2' | 'D3' | 'D4' | 'D5' | 'D7' | 'D8';
export type Technique = 'SWSI' | 'DWSI' | 'DWDI-ELLIPSE';
export type TestClass = 'A' | 'B';
export type IqiSide = 'source' | 'film';
export type Status = 'green' | 'orange' | 'red';
export type SourceKind = 'pdf' | 'docx' | 'text';

export interface Evidence {
  quote: string;
  line: number;
  confidence: 'high' | 'medium' | 'low';
}
export interface ApprovedIqiRule {
  id: string;
  technique: Technique;
  side: IqiSide;
  class: TestClass;
  basis: 'nominal' | 'penetrated';
  aboveMm: number; // exclusive, except first rule with 0
  upToMm: number; // inclusive
  wireNumber: number; // W1 to W19; higher W = finer wire
  reference: string;
}
export interface ApprovedExposureCountRule {
  id: string;
  technique: Technique;
  class: TestClass;
  minDiameterMm: number;
  maxDiameterMm: number;
  minWallMm: number;
  maxWallMm: number;
  minSfdMm: number;
  maxSfdMm: number;
  minimumExposures: number;
  sourcePlacement: 'internal-central' | 'external' | 'internal-offset';
  reference: string; // RT L3-reviewed Annex A / drawing / validated table entry
}
export interface ProcedureProfile {
  schemaVersion: 1;
  id: string;
  code: string;
  customer: string;
  revision: string;
  norm: 'ISO 17636-1:2022';
  class: TestClass;
  planarDefectsRequired: boolean;
  sources: SourceType[];
  films: FilmType[];
  thickness: { minMm: number; maxMm: number };
  density: { min: number; max: number };
  techniques: Technique[];
  iqi: {
    side: IqiSide | 'either';
    extraFinerWires: number;
    filmSideComparisonVerified: boolean;
    approvedRules: ApprovedIqiRule[];
  };
  planning: {
    minimumFilmOverlapMm: number | null;
    approvedExposureRules: ApprovedExposureCountRule[];
  };
  confirmedBy: string;
  confirmedAt: string;
  source: { kind: SourceKind; fileName?: string; sha256?: string };
  createdAt: string;
  updatedAt: string;
}
export type DraftCandidate = Omit<ProcedureProfile, 'schemaVersion'|'id'|'confirmedBy'|'confirmedAt'|'createdAt'|'updatedAt'>;
export interface ProcedureDraft {
  candidate: Partial<DraftCandidate>;
  evidence: Record<string, Evidence[]>;
  warnings: string[];
  source: {kind: SourceKind; fileName?: string; sha256?: string};
}
export interface ExposureInput {
  source: SourceType;
  film: FilmType;
  technique: Technique;
  thicknessMm: number;
  penetratedThicknessMm: number | null;
  /** Max local penetrated path at the edge of the evaluated area; if known. */
  maximumPathThicknessMm: number | null;
  density: number;
  sfdMm: number;
  activityCi?: number;
  model?: string;
  kv?: number;
  ma?: number;
  material?: string;
  geometry: {
    diameterMm: number | null;
    sourcePlacement: 'internal-central' | 'external' | 'internal-offset' | null;
    sourceSizeMm: number | null; // larger of 2 dimensions
    objectToFilmMm: number | null;
    filmUsableLengthMm: number | null;
    filmWrapped: boolean;
  };
  iqiSide: IqiSide;
}
export interface ExposureResult {
  ok: boolean;
  minutes?: number;
  error?: string;
  calibrationStatus?: 'verified' | 'unverified';
  datasetId?: string;
}
export type CalculateExposure = (input: Readonly<ExposureInput>) => ExposureResult | Promise<ExposureResult>;
export interface Check {
  code: string;
  status: Status;
  message: string;
}
export interface FilmPlan {
  circumferenceMm: number | null;
  filmSegments: number | null;
  minimumExposures: number | null;
  maxThicknessIncreasePercent: number | null;
  maxAllowedPercent: number;
}
export interface IqiRequirement {
  wireNumber: number | null;
  wireDiameterMm: number | null;
  position: IqiSide;
  reference: string | null;
}
export interface EvaluatedPlan {
  status: Status;
  checks: Check[];
  input: ExposureInput;
  profileId: string;
  profileRevision: string;
  exposure: ExposureResult | null;
  filmPlan: FilmPlan;
  iqi: IqiRequirement;
  evaluatedAt: string;
}
export interface SavedPlan {
  id: string;
  name: string;
  createdAt: string;
  procedureSnapshot: ProcedureProfile;
  result: EvaluatedPlan;
}
export interface ProcedureBackup {
  format: 'ndt-radiography-pro-backup';
  version: 1;
  exportedAt: string;
  activeProcedureId: string | null;
  profiles: ProcedureProfile[];
  plans: SavedPlan[];
}
