// ─── Frontmatter ─────────────────────────────────────────────────────────────

export type PlanStatus    = 'planned' | 'in-progress' | 'blocked';
export type PlanPriority  = 'next' | 'high' | 'medium' | 'low';
export type PlanDifficulty = 'easy' | 'medium' | 'hard';
export type PlanImpact    = 'low' | 'medium' | 'high' | 'critical';
export type PlanExecution = 'phased' | 'coordination';
export type PhaseStatus   = 'planned' | 'ready' | 'blocked' | 'in-progress';

export interface Frontmatter {
  type?:               string;
  title:               string;
  description?:        string;
  difficulty?:         PlanDifficulty;
  impact?:             PlanImpact;
  package?:            string[];
  tags?:               string[];
  status?:             PlanStatus;
  priority?:           PlanPriority;
  execution?:          PlanExecution;
  phase_budget_hours?: number;
  [key: string]:       unknown;
}

// ─── Body ─────────────────────────────────────────────────────────────────────

export interface Phase {
  id:       string;         // e.g. "PA-01"
  title:    string;
  rawBody:  string;
  status:   PhaseStatus;
  refs:     string[];       // PA-XX ids referenced in body
}

export interface Section {
  heading: string;          // H1 text without the #
  body:    string;
  phases:  Phase[];
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface PlanDependency {
  text:     string;         // link text
  href:     string;         // relative path e.g. ../other-plan.md
  resolved?: string;        // resolved plan id once cross-linked
}

export interface ParsedPlan {
  id:           string;     // repo:filename (unique key)
  repoId:       string;
  fileName:     string;
  raw:          string;
  frontmatter:  Frontmatter;
  sections:     Section[];
  dependencies: PlanDependency[];
  phaseRefs:    string[];   // all PA-XX ids found anywhere in body
  parseErrors:  string[];
}

// ─── Repo ─────────────────────────────────────────────────────────────────────

export type RepoColor =
  | '#61afef' | '#98c379' | '#e5c07b' | '#e06c75'
  | '#c678dd' | '#56b6c2' | '#d19a66';

export interface WikiRepo {
  id:        string;       // unique label (folder / project name)
  uuid?:     string;       // stable identity of a loaded wiki (absent for demo data)
  label:     string;
  color:     RepoColor;
  planCount: number;
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface PlanFilters {
  status:     PlanStatus[];
  priority:   PlanPriority[];
  impact:     PlanImpact[];
  difficulty: PlanDifficulty[];
  tags:       string[];
  packages:   string[];
  repos:      string[];
  search:     string;
}

// ─── Warning ─────────────────────────────────────────────────────────────────

export interface ParseWarning {
  repoId:   string;
  fileName: string;
  errors:   string[];
}

