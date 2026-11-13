export interface Plan {
  id: string;
  title: string;
  description?: string;
  date?: Date;
  /** Address or a Google Maps link. */
  location?: string;
  completed: boolean;
  /** Set when the plan is marked as done (plans completed before this field existed don't have it). */
  completedAt?: Date;
  category: "gastronomia" | "aire_libre" | "entretenimiento" | "educativo" | "otros";
  remindersSent?: {
    eve?: string;
    day?: string;
  };
}

export interface NewPlanFormState {
  title: string;
  description?: string;
  date?: string;
  location?: string;
  category: Plan["category"];
}
