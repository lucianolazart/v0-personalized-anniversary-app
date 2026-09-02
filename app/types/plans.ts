export interface Plan {
  id: string;
  title: string;
  description?: string;
  date?: Date;
  completed: boolean;
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
  category: Plan["category"];
} 