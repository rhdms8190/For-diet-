export interface BodyRecord {
  id: string;
  date: string; // ISO string
  weight: number;
  muscleMass: number;
  bodyFat: number;
}

export interface MealRecord {
  id: string;
  date: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isHighProtein: boolean;
  imageUrl?: string; // Base64 or URL
}

export interface ExerciseRecord {
  id: string;
  date: string;
  exerciseName: string;
  duration: number; // minutes
  caloriesBurned: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  height: number;
  weight: number;
  targetWeight: number;
  targetDurationWeeks: number;
  activityLevel: number; // 1.2 to 1.9
  macroRatio: {
    carbs: number;
    protein: number;
    fat: number;
  };
  unlockedBadges: string[]; // Badge IDs
  recipeCount?: number;
}

export interface DailySummary {
  consumedCalories: number;
  burnedCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  name: string;
  ingredients: string[];
  instructions: string[];
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}
