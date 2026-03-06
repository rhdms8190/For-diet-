import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Utensils, 
  Dumbbell, 
  Scale, 
  ChevronLeft, 
  ChevronRight,
  Brain,
  CheckCircle2,
  AlertCircle,
  User,
  Settings,
  Info,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Award,
  ChefHat,
  Search
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  startOfWeek,
  endOfWeek,
  subDays
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn, calculateBMR, calculateTDEE, calculateBMI, getBMICategory } from './lib/utils';
import { analyzeMeal, analyzeExercise, getRecipeRecommendation } from './services/gemini';
import { BodyRecord, MealRecord, ExerciseRecord, UserProfile, DailySummary, Badge, Recipe } from './types';

// Mock Initial Data
const INITIAL_PROFILE: UserProfile = {
  name: '득근이',
  age: 30,
  gender: 'male',
  height: 175,
  weight: 75,
  startWeight: 80,
  targetWeight: 70,
  targetDurationWeeks: 8,
  activityLevel: 1.375, // Lightly active
  macroRatio: {
    carbs: 50,
    protein: 30,
    fat: 20
  },
  unlockedBadges: []
};

const BADGES: Badge[] = [
  // 연속 기록 (Consistency)
  { id: 'consistency_3', name: '작심삼일 탈출', description: '3일 연속 기록 달성', icon: '🔥' },
  { id: 'consistency_7', name: '일주일의 기적', description: '7일 연속 기록 달성', icon: '⭐' },
  { id: 'consistency_30', name: '습관의 완성', description: '30일 연속 기록 달성', icon: '🏆' },
  { id: 'consistency_100', name: '다이어트 철인', description: '100일 연속 기록 달성', icon: '💎' },
  
  // 영양소 달성 (Nutrition)
  { id: 'protein_king', name: '득근왕', description: '일일 단백질 목표 달성', icon: '🍗' },
  { id: 'protein_pro', name: '프로 득근러', description: '일주일 내내 단백질 목표 달성', icon: '💪' },
  { id: 'fat_clean', name: '클린 식단 마스터', description: '지방 섭취 목표 3일 유지', icon: '🥗' },
  { id: 'carb_god', name: '당질 제한의 신', description: '탄수화물 절제 성공 (목표의 80% 이하)', icon: '🙅‍♂️' },
  
  // 신체 변화 (Body Transformation)
  { id: 'start_half', name: '시작이 반', description: '첫 몸무게 기록 완료', icon: '🏁' },
  { id: 'muscle_gain_1', name: '근성장의 아이콘', description: '골격근량 1kg 증량 성공', icon: '📈' },
  { id: 'goal_50', name: '반환점 통과', description: '목표 체중까지 50% 달성', icon: '🚩' },
  { id: 'diet_master', name: '다이어트 마스터', description: '목표 체중 2kg 이내 접근', icon: '🎯' },
  
  // 활동량 (Activity)
  { id: 'calorie_hunter', name: '칼로리 헌터', description: '누적 소모 칼로리 1,000kcal 돌파', icon: '🏹' },
  { id: 'exercise_pro', name: '오운완 장인', description: '한 달간 15일 이상 운동 기록', icon: '👟' },
  
  // AI 활용 (Smart User)
  { id: 'recipe_explorer', name: '레시피 탐험가', description: '첫 AI 레시피 추천 받기', icon: '👨‍🍳' },
  { id: 'recipe_master', name: '요리하는 다이어터', description: 'AI 레시피 5번 추천 받기', icon: '🍳' },
  { id: 'photo_pro', name: '프로 기록러', description: '식단 사진 10장 업로드', icon: '📸' }
];

const MOTIVATIONAL_MESSAGES = (name: string) => [
  `${name}님, 오늘도 득근하세요! 💪`,
  `${name}님, 단백질 잊지 마세요! 🍗`,
  "꾸준함이 답입니다! 🔥",
  "어제의 나보다 더 건강하게! ✨",
  `${name}님, 물 한 잔 마시고 시작할까요? 💧`,
  "근육은 배신하지 않습니다! 🏋️",
  "오늘 하루도 고생 많으셨어요! 🌟"
];

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('diet_planner_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...INITIAL_PROFILE, ...parsed };
    }
    return INITIAL_PROFILE;
  });
  const [bodyRecords, setBodyRecords] = useState<BodyRecord[]>(() => {
    const saved = localStorage.getItem('diet_planner_body');
    return saved ? JSON.parse(saved) : [];
  });
  const [mealRecords, setMealRecords] = useState<MealRecord[]>(() => {
    const saved = localStorage.getItem('diet_planner_meals');
    return saved ? JSON.parse(saved) : [];
  });
  const [exerciseRecords, setExerciseRecords] = useState<ExerciseRecord[]>(() => {
    const saved = localStorage.getItem('diet_planner_exercises');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'body' | 'badges'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState<'meal' | 'exercise' | 'body' | 'profile' | 'recipe' | null>(null);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [recipeIngredients, setRecipeIngredients] = useState("");
  const [recommendedRecipe, setRecommendedRecipe] = useState<Recipe | null>(null);
  const [mealImage, setMealImage] = useState<string | null>(null);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  useEffect(() => {
    localStorage.setItem('diet_planner_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('diet_planner_body', JSON.stringify(bodyRecords));
  }, [bodyRecords]);

  useEffect(() => {
    localStorage.setItem('diet_planner_meals', JSON.stringify(mealRecords));
  }, [mealRecords]);

  useEffect(() => {
    localStorage.setItem('diet_planner_exercises', JSON.stringify(exerciseRecords));
  }, [exerciseRecords]);

  useEffect(() => {
    setMessage(`${profile.name}님, 오늘 냉장고에 있는 재료로 이런 요리 어떠세요? 😊`);
  }, [profile.name]);

  // Derived Values
  const bmr = useMemo(() => calculateBMR(profile.weight, profile.height, profile.age, profile.gender), [profile]);
  const tdee = useMemo(() => calculateTDEE(bmr, profile.activityLevel), [bmr, profile.activityLevel]);
  
  const targetCalories = useMemo(() => {
    const weightDiff = profile.weight - profile.targetWeight;
    const totalDeficitNeeded = weightDiff * 7700; // 1kg approx 7700kcal
    const days = profile.targetDurationWeeks * 7;
    const dailyDeficit = days > 0 ? totalDeficitNeeded / days : 0;
    const target = Math.round(tdee - dailyDeficit);
    return Math.max(target, 1200); // Minimum 1200kcal for safety
  }, [tdee, profile.weight, profile.targetWeight, profile.targetDurationWeeks]);

  const macroGoals = useMemo(() => {
    const ratio = profile.macroRatio || INITIAL_PROFILE.macroRatio;
    return {
      carbs: Math.round((targetCalories * ratio.carbs / 100) / 4),
      protein: Math.round((targetCalories * ratio.protein / 100) / 4),
      fat: Math.round((targetCalories * ratio.fat / 100) / 9),
    };
  }, [targetCalories, profile.macroRatio]);

  const bmi = useMemo(() => calculateBMI(profile.weight, profile.height), [profile.weight, profile.height]);
  const bmiCategory = useMemo(() => getBMICategory(bmi), [bmi]);

  const weightProgress = useMemo(() => {
    const { startWeight, weight, targetWeight } = profile;
    const totalToChange = Math.abs(startWeight - targetWeight);
    const changedSoFar = Math.abs(startWeight - weight);
    
    if (totalToChange === 0) return 100;
    
    // Check if we are moving towards the goal
    const isWeightLoss = targetWeight < startWeight;
    const isGoalReached = isWeightLoss ? weight <= targetWeight : weight >= targetWeight;
    
    if (isGoalReached) return 100;
    
    const progress = (changedSoFar / totalToChange) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [profile.weight, profile.startWeight, profile.targetWeight]);

  const weightRemaining = Math.abs(profile.weight - profile.targetWeight);
  const isGoalReached = useMemo(() => {
    const isWeightLoss = profile.targetWeight < profile.startWeight;
    return isWeightLoss ? profile.weight <= profile.targetWeight : profile.weight >= profile.targetWeight;
  }, [profile.weight, profile.targetWeight, profile.startWeight]);

  const dailySummary = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const meals = mealRecords.filter(m => m.date === dateStr) || [];
    const exercises = exerciseRecords.filter(e => e.date === dateStr) || [];

    return {
      consumedCalories: meals.reduce((sum, m) => sum + (m.calories || 0), 0) || 0,
      burnedCalories: exercises.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0) || 0,
      protein: meals.reduce((sum, m) => sum + (m.protein || 0), 0) || 0,
      carbs: meals.reduce((sum, m) => sum + (m.carbs || 0), 0) || 0,
      fat: meals.reduce((sum, m) => sum + (m.fat || 0), 0) || 0,
    };
  }, [selectedDate, mealRecords, exerciseRecords]);

  const aiAdvice = useMemo(() => {
    const proteinDiff = macroGoals.protein - dailySummary.protein;
    const carbDiff = macroGoals.carbs - dailySummary.carbs;
    const calorieDiff = targetCalories - dailySummary.consumedCalories;

    if (dailySummary.consumedCalories === 0) return "오늘의 첫 식단을 기록해보세요! 균형 잡힌 영양이 중요합니다.";
    
    let advice = "";
    if (proteinDiff > 10) {
      advice = `${profile.name}님, 오늘 단백질이 ${Math.round(proteinDiff)}g 부족해요! 닭가슴살이나 달걀 한 알 어때요? 🍗`;
    } else if (calorieDiff < -100) {
      advice = "오늘 목표 칼로리를 조금 초과했어요. 내일은 조금 더 가볍게 드셔보는 건 어떨까요? 🌱";
    } else if (carbDiff > 30) {
      advice = "에너지가 부족해 보입니다. 복합 탄수화물(고구마, 현미밥)로 에너지를 보충해보세요! 🍠";
    } else {
      advice = "정말 훌륭한 식단입니다! 이대로만 유지하면 목표 달성이 머지않았어요. 👍";
    }
    return advice;
  }, [dailySummary, macroGoals, targetCalories, profile.name]);

  // Badge Checking Logic
  useEffect(() => {
    const checkBadges = () => {
      const newBadges = [...profile.unlockedBadges];
      let newlyUnlocked: Badge[] = [];

      const addBadge = (id: string) => {
        if (!newBadges.includes(id)) {
          newBadges.push(id);
          const badge = BADGES.find(b => b.id === id);
          if (badge) newlyUnlocked.push(badge);
          return true;
        }
        return false;
      };

      // 1. Consistency
      const dates = [...new Set(mealRecords.map(m => m.date))].sort() as string[];
      if (dates.length > 0) {
        let maxConsecutive = 1;
        let currentConsecutive = 1;
        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i-1]);
          const curr = new Date(dates[i]);
          const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            currentConsecutive++;
          } else {
            currentConsecutive = 1;
          }
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        }
        
        if (maxConsecutive >= 3) addBadge('consistency_3');
        if (maxConsecutive >= 7) addBadge('consistency_7');
        if (maxConsecutive >= 30) addBadge('consistency_30');
        if (maxConsecutive >= 100) addBadge('consistency_100');
      }

      // 2. Nutrition
      // Protein King (Today)
      if (dailySummary.protein >= macroGoals.protein) addBadge('protein_king');
      
      // Protein Pro (7 days in a row)
      const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
      const proteinMetCount = last7Days.filter(date => {
        const dayMeals = mealRecords.filter(m => m.date === date);
        const dayProtein = dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
        return dayProtein >= macroGoals.protein;
      }).length;
      if (proteinMetCount >= 7) addBadge('protein_pro');

      // Fat Clean (3 days)
      const last3Days = Array.from({ length: 3 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
      const fatMetCount = last3Days.filter(date => {
        const dayMeals = mealRecords.filter(m => m.date === date);
        const dayFat = dayMeals.reduce((sum, m) => sum + (m.fat || 0), 0);
        return dayFat > 0 && dayFat <= macroGoals.fat;
      }).length;
      if (fatMetCount >= 3) addBadge('fat_clean');

      // Carb God (Today restriction)
      if (dailySummary.carbs > 0 && dailySummary.carbs <= macroGoals.carbs * 0.8) addBadge('carb_god');

      // 3. Body Transformation
      if (bodyRecords.length >= 1) addBadge('start_half');
      
      if (bodyRecords.length >= 2) {
        const firstMuscle = bodyRecords[0].muscleMass;
        const latestMuscle = bodyRecords[bodyRecords.length - 1].muscleMass;
        if (latestMuscle - firstMuscle >= 1) addBadge('muscle_gain_1');
      }

      const initialWeight = bodyRecords.length > 0 ? bodyRecords[0].weight : profile.weight;
      const totalGoal = initialWeight - profile.targetWeight;
      const currentProgress = initialWeight - profile.weight;
      if (totalGoal > 0 && currentProgress >= totalGoal * 0.5) addBadge('goal_50');

      if (Math.abs(profile.weight - profile.targetWeight) <= 2) addBadge('diet_master');

      // 4. Activity
      const totalBurned = exerciseRecords.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0);
      if (totalBurned >= 1000) addBadge('calorie_hunter');

      const exerciseDates = [...new Set(exerciseRecords.map(e => e.date))] as string[];
      const currentMonthStr = format(new Date(), 'yyyy-MM');
      const monthlyExerciseCount = exerciseDates.filter(d => d.startsWith(currentMonthStr)).length;
      if (monthlyExerciseCount >= 15) addBadge('exercise_pro');

      // 5. AI & Smart User
      if ((profile.recipeCount || 0) >= 1) addBadge('recipe_explorer');
      if ((profile.recipeCount || 0) >= 5) addBadge('recipe_master');

      const photoCount = mealRecords.filter(m => !!m.imageUrl).length;
      if (photoCount >= 10) addBadge('photo_pro');

      if (newlyUnlocked.length > 0) {
        setProfile(prev => ({ ...prev, unlockedBadges: newBadges }));
        setNewBadge(newlyUnlocked[newlyUnlocked.length - 1]); // Show the latest one
      }
    };

    checkBadges();
  }, [mealRecords, exerciseRecords, bodyRecords, dailySummary, macroGoals, profile.weight, profile.targetWeight, profile.recipeCount]);

  const macroPieData = useMemo(() => [
    { name: '탄수화물', value: Math.max(0.1, dailySummary.carbs), color: '#FB923C' },
    { name: '단백질', value: Math.max(0.1, dailySummary.protein), color: '#60A5FA' },
    { name: '지방', value: Math.max(0.1, dailySummary.fat), color: '#FACC15' },
  ], [dailySummary]);

  const remainingCalories = targetCalories - dailySummary.consumedCalories + dailySummary.burnedCalories;

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const record = bodyRecords.find(r => r.date === dateStr);
      return {
        name: format(d, 'MM/dd'),
        weight: record?.weight || null,
        muscle: record?.muscleMass || null,
      };
    }).filter(d => d.weight !== null || d.muscle !== null);
    return last7Days;
  }, [bodyRecords]);

  // Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMealImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMeal = async (text: string) => {
    setIsLoading(true);
    try {
      let analysis;
      try {
        analysis = await analyzeMeal(text);
      } catch (apiError) {
        console.warn("AI Analysis failed, using mock data", apiError);
        // Mock data fallback for better UX
        analysis = {
          foodName: text,
          calories: 450,
          protein: 20,
          carbs: 60,
          fat: 15,
          isHighProtein: false
        };
      }
      const newMeal: MealRecord = {
        id: Math.random().toString(36).substr(2, 9),
        date: format(selectedDate, 'yyyy-MM-dd'),
        imageUrl: mealImage || undefined,
        ...analysis
      };
      setMealRecords(prev => [...prev, newMeal]);
      setMealImage(null);
      setIsModalOpen(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetRecipe = async () => {
    if (!recipeIngredients) return;
    setIsLoading(true);
    try {
      const recipe = await getRecipeRecommendation(recipeIngredients);
      setRecommendedRecipe(recipe);
      
      setProfile(prev => ({
        ...prev,
        recipeCount: (prev.recipeCount || 0) + 1
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExercise = async (text: string) => {
    setIsLoading(true);
    try {
      let analysis;
      try {
        analysis = await analyzeExercise(text, profile.weight);
      } catch (apiError) {
        console.warn("AI Analysis failed, using mock data", apiError);
        // Mock data fallback
        analysis = {
          exerciseName: text,
          caloriesBurned: 200,
          duration: 30
        };
      }
      const newExercise: ExerciseRecord = {
        id: Math.random().toString(36).substr(2, 9),
        date: format(selectedDate, 'yyyy-MM-dd'),
        ...analysis
      };
      setExerciseRecords(prev => [...prev, newExercise]);
      setIsModalOpen(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBody = (weight: number, muscle: number, fat: number, height?: number) => {
    const newRecord: BodyRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: format(selectedDate, 'yyyy-MM-dd'),
      weight,
      muscleMass: muscle,
      bodyFat: fat
    };
    setBodyRecords(prev => {
      const filtered = prev.filter(r => r.date !== newRecord.date);
      return [...filtered, newRecord].sort((a, b) => a.date.localeCompare(b.date));
    });
    setProfile(prev => ({ ...prev, weight, height: height || prev.height }));
    setIsModalOpen(null);
  };

  const handleUpdateProfile = (
    name: string, 
    height: number, 
    age: number, 
    startWeight: number,
    targetWeight: number,
    targetDurationWeeks: number,
    macroRatio: { carbs: number; protein: number; fat: number }
  ) => {
    setProfile(prev => ({ 
      ...prev, 
      name, 
      height, 
      age, 
      startWeight,
      targetWeight, 
      targetDurationWeeks,
      macroRatio 
    }));
    setIsModalOpen(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans pb-24">
      {/* Header / Progress */}
      <header className="bg-white px-6 pt-8 pb-6 shadow-sm rounded-b-3xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">안녕하세요, {profile.name}님!</h1>
            <p className="text-sm text-gray-500">{format(new Date(), 'yyyy년 MMMM d일', { locale: ko })}</p>
          </div>
          <button 
            onClick={() => setIsModalOpen('profile')}
            className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Motivational Message */}
        <div className="mb-6 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center gap-3">
          <Brain className="w-5 h-5 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-800">{message}</p>
        </div>

        {/* BMI & Weight Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase">현재 BMI</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{bmi.toFixed(1)}</span>
              <span className="text-xs font-medium text-emerald-700">{bmiCategory}</span>
            </div>
          </div>
          <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] font-bold text-blue-600 uppercase">현재 키</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold">{profile.height}</span>
              <span className="text-xs font-medium text-blue-700">cm</span>
            </div>
          </div>
        </div>

        {/* Weight Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">체중 관리 현황</p>
              <p className="text-sm font-bold text-emerald-600">
                {isGoalReached ? (
                  <span className="flex items-center gap-1">목표 달성! 축하합니다 🎉</span>
                ) : (
                  `목표까지 ${weightRemaining.toFixed(1)}kg 남았어요!`
                )}
              </p>
            </div>
            <span className="text-xl font-black text-emerald-500">{Math.round(weightProgress)}%</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${weightProgress}%` }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span>현재: {profile.weight}kg</span>
            <span>목표: {profile.targetWeight}kg</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 rounded-lg">
                <Utensils className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500">남은 칼로리</span>
            </div>
            <div className="text-xl font-bold">{Math.round(remainingCalories)} <span className="text-xs font-normal text-gray-400">/ {targetCalories} kcal</span></div>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500">단백질</span>
            </div>
            <div className="text-xl font-bold">{Math.round(dailySummary.protein)} <span className="text-xs font-normal text-gray-400">/ {macroGoals.protein}g</span></div>
          </div>
        </div>
      </header>

      {/* Main Content Based on Active Tab */}
      <main className="px-6 mt-8">
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Exercise Burned Message */}
            {dailySummary.burnedCalories > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3"
              >
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Dumbbell className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-blue-800">
                  오늘 운동으로 <span className="font-bold">{dailySummary.burnedCalories}kcal</span>를 태우셨어요! 그만큼 더 건강하게 드실 수 있습니다.
                </p>
              </motion.div>
            )}

            {/* Muscle Trend Chart */}
            {/* 1. 체성분 상태와 골격근량 추이를 가로로 나란히 배치 */}
<section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  
  {/* 왼쪽: 나의 체성분 상태 */}
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center h-full">
    <h2 className="text-lg font-bold mb-4 text-[#1A1A1A]">나의 체성분 상태</h2>
    <div className="flex justify-around items-center">
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1">현재 BMI</p>
        <p className="text-xl font-bold text-emerald-500">24.5</p>
        <span className="text-[10px] text-emerald-600 font-medium">과체중</span>
      </div>
      <div className="w-px h-12 bg-gray-100" />
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1">목표까지</p>
        <p className="text-xl font-bold text-blue-500">5.0kg</p>
        <span className="text-[10px] text-blue-600 font-medium">감량 필요</span>
      </div>
    </div>
  </div>

  {/* 오른쪽: 골격근량 추이 (슬림하게 수정) */}
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-bold text-[#1A1A1A]">골격근량 추이</h2>
      <span className="text-xs text-gray-400">최근 7일</span>
    </div>
    {/* 높이를 180px로 줄여서 체성분 카드와 높이를 맞춤 */}
    <div style={{ width: '100%', height: '180px' }}>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMuscle" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} />
            <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Area type="monotone" dataKey="muscle" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorMuscle)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
          <TrendingUp className="w-8 h-8 opacity-20" />
          <p className="text-sm">기록이 없습니다.</p>
        </div>
      )}
    </div>
  </div>
</section>

            {/* AI Nutrition Advice */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">AI 영양 가이드</span>
                  </div>
                  <p className="text-lg font-medium leading-relaxed">
                    {aiAdvice}
                  </p>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <Utensils className="w-32 h-32" />
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen('recipe')}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">냉장고 파먹기 AI 레시피</h3>
                  <p className="text-xs text-gray-400">남은 재료로 만드는 저칼로리 식단</p>
                </div>
              </button>
            </section>

            {/* BMI Progress Card */}
            <section>
              <h2 className="text-lg font-bold mb-4">나의 체성분 상태</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
                    <Scale className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">현재 BMI</p>
                  <p className="text-2xl font-bold">{bmi.toFixed(1)}</p>
                  <p className="text-xs font-medium text-emerald-600 mt-1">{bmiCategory}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">목표까지</p>
                  <p className="text-2xl font-bold">{Math.abs(profile.weight - profile.targetWeight).toFixed(1)}kg</p>
                  <p className="text-xs font-medium text-blue-600 mt-1">{profile.weight > profile.targetWeight ? '감량 필요' : '증량 필요'}</p>
                </div>
              </div>
            </section>

            {/* Daily Stats Summary */}
            <section>
              <h2 className="text-lg font-bold mb-4">오늘의 영양 상태</h2>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">섭취 / 목표 칼로리</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {dailySummary.consumedCalories} 
                      <span className="text-sm font-normal text-gray-400 ml-1">/ {targetCalories} kcal</span>
                    </p>
                  </div>
                  <div className="flex-1 w-full" style={{ width: '100%', height: '300px', minHeight: '300px' }}>
                    {dailySummary.consumedCalories > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={macroPieData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {macroPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 border border-dashed border-gray-100 rounded-3xl">
                        <Utensils className="w-8 h-8 opacity-20" />
                        <p className="text-sm">식단 기록을 입력해주세요.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                        탄수화물
                      </span>
                      <span className="text-gray-400">{Math.round(dailySummary.carbs)}g / {macroGoals.carbs}g</span>
                    </div>
                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 transition-all duration-500" style={{ width: `${Math.min(100, (dailySummary.carbs / macroGoals.carbs) * 100)}%` }} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        단백질
                      </span>
                      <span className="text-gray-400">{Math.round(dailySummary.protein)}g / {macroGoals.protein}g</span>
                    </div>
                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${Math.min(100, (dailySummary.protein / macroGoals.protein) * 100)}%` }} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                        지방
                      </span>
                      <span className="text-gray-400">{Math.round(dailySummary.fat)}g / {macroGoals.fat}g</span>
                    </div>
                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${Math.min(100, (dailySummary.fat / macroGoals.fat) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'calendar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Calendar Section */}
            <section>
              <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold">{format(currentMonth, 'yyyy년 MMMM', { locale: ko })}</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                    <div key={`${day}-${index}`} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const start = startOfWeek(startOfMonth(currentMonth));
                    const end = endOfWeek(endOfMonth(currentMonth));
                    const days = eachDayOfInterval({ start, end });

                    return days.map(day => {
                      const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                      const isSel = isSameDay(day, selectedDate);
                      const isTod = isToday(day);
                      
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const dayMeals = mealRecords.filter(m => m.date === dateStr) || [];
                      const totalCal = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
                      const hasRecord = totalCal > 0;
                      const isSuccess = hasRecord && totalCal < (tdee || 2000);

                      return (
                        <button
                          key={day.toString()}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all",
                            !isCurrentMonth && "opacity-20",
                            isSel ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "hover:bg-gray-50",
                            isTod && !isSel && "border border-emerald-200 text-emerald-600 font-bold"
                          )}
                        >
                          <span className="text-sm">{format(day, 'd')}</span>
                          {hasRecord && !isSel && (
                            <div className={cn(
                              "w-1 h-1 rounded-full absolute bottom-1.5",
                              isSuccess ? "bg-emerald-400" : "bg-rose-400"
                            )} />
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </section>

            {/* Selected Day Details */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">기록 상세</h2>
                <span className="text-xs text-gray-400">{format(selectedDate, 'yyyy년 M월 d일', { locale: ko })}</span>
              </div>
              
              <div className="space-y-3">
                {mealRecords.filter(m => m.date === format(selectedDate, 'yyyy-MM-dd')).map(meal => (
                  <div key={meal.id} className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-xl">
                          <Utensils className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{meal.foodName || '알 수 없는 식단'}</h3>
                          <p className="text-xs text-gray-400">단: {meal.protein || 0}g • 탄: {meal.carbs || 0}g • 지: {meal.fat || 0}g</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{meal.calories || 0} kcal</p>
                      </div>
                    </div>
                    {meal.imageUrl && (
                      <div className="rounded-xl overflow-hidden h-32">
                        <img src={meal.imageUrl} alt={meal.foodName} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ))}

                {exerciseRecords.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')).map(ex => (
                  <div key={ex.id} className="bg-white p-4 rounded-2xl flex justify-between items-center border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-xl">
                        <Dumbbell className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{ex.exerciseName || '알 수 없는 운동'}</h3>
                        <p className="text-xs text-gray-400">{ex.duration || 0}분</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-emerald-600">-{ex.caloriesBurned || 0} kcal</p>
                    </div>
                  </div>
                ))}

                {mealRecords.filter(m => m.date === format(selectedDate, 'yyyy-MM-dd')).length === 0 && 
                 exerciseRecords.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')).length === 0 && (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">기록이 없습니다.</p>
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'body' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <section>
              <h2 className="text-lg font-bold mb-4">신체 데이터 히스토리</h2>
              <div className="space-y-4">
                {bodyRecords.slice().reverse().map(record => (
                  <div key={record.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-gray-400">{format(new Date(record.date), 'yyyy년 M월 d일', { locale: ko })}</span>
                      <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                        BMI {(record.weight / ((profile.height/100)**2)).toFixed(1)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">체중</p>
                        <p className="text-lg font-bold">{record.weight}kg</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">골격근량</p>
                        <p className="text-lg font-bold text-blue-600">{record.muscleMass}kg</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">체지방률</p>
                        <p className="text-lg font-bold text-orange-600">{record.bodyFat}%</p>
                      </div>
                    </div>
                  </div>
                ))}
                {bodyRecords.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">기록된 신체 데이터가 없습니다.</p>
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'badges' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <section>
              <h2 className="text-lg font-bold mb-4">획득한 배지</h2>
              <div className="grid grid-cols-2 gap-4">
                {BADGES.map(badge => {
                  const isUnlocked = profile.unlockedBadges.includes(badge.id);
                  return (
                    <div 
                      key={badge.id} 
                      className={cn(
                        "p-6 rounded-3xl border flex flex-col items-center text-center transition-all",
                        isUnlocked 
                          ? "bg-white border-emerald-100 shadow-sm" 
                          : "bg-gray-50 border-gray-100 opacity-50 grayscale"
                      )}
                    >
                      <div className="text-4xl mb-3">{badge.icon}</div>
                      <h3 className="font-bold text-sm mb-1">{badge.name}</h3>
                      <p className="text-[10px] text-gray-400">{badge.description}</p>
                      {isUnlocked && (
                        <div className="mt-3 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-bold">
                          획득 완료
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </motion.div>
        )}
      </main>

      {/* Floating Action Button */}
      <AnimatePresence>
        {isFabMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFabMenuOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-24 right-6 flex flex-col items-end gap-3 z-50">
        <AnimatePresence>
          {isFabMenuOpen && (
            <div className="flex flex-col items-end gap-3 mb-3">
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                onClick={() => { setIsModalOpen('body'); setIsFabMenuOpen(false); }}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-lg border border-gray-100 text-sm font-bold text-gray-700"
              >
                <span>체성분 기록</span>
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Scale className="w-5 h-5" />
                </div>
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                onClick={() => { setIsModalOpen('exercise'); setIsFabMenuOpen(false); }}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-lg border border-gray-100 text-sm font-bold text-gray-700"
              >
                <span>운동 기록</span>
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <Dumbbell className="w-5 h-5" />
                </div>
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                onClick={() => { setIsModalOpen('meal'); setIsFabMenuOpen(false); }}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-lg border border-gray-100 text-sm font-bold text-gray-700"
              >
                <span>식단 기록</span>
                <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
                  <Utensils className="w-5 h-5" />
                </div>
              </motion.button>
            </div>
          )}
        </AnimatePresence>
        
        <motion.button
          animate={{ rotate: isFabMenuOpen ? 45 : 0 }}
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors",
            isFabMenuOpen ? "bg-gray-800 text-white" : "bg-emerald-500 text-white shadow-emerald-200"
          )}
        >
          <Plus className="w-8 h-8" />
        </motion.button>
      </div>

     {/* Modals */}
  <AnimatePresence>
    {isModalOpen && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsModalOpen(null)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {isModalOpen === 'profile' ? '프로필 설정' : 
               isModalOpen === 'meal' ? '식단 추가' : 
               isModalOpen === 'exercise' ? '운동 추가' : '정보 입력'}
            </h2>
            <button 
              onClick={() => setIsModalOpen(null)}
              className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {isModalOpen === 'profile' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500"
                  defaultValue={profile.name}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">키 (cm)</label>
                  <input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border-none" defaultValue={profile.height} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">나이</label>
                  <input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border-none" defaultValue={profile.age} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">현재 체중 (kg)</label>
                  <input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border-none" defaultValue={profile.weight} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">목표 체중 (kg)</label>
                  <input type="number" className="w-full p-4 bg-gray-50 rounded-2xl border-none" defaultValue={profile.targetWeight} />
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(null)}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors"
              >
                설정 저장
              </button>
            </div>
          )}
              {isModalOpen === 'meal' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const text = (e.target as any).mealText.value;
                  handleAddMeal(text);
                }}>
                  <p className="text-sm text-gray-500 mb-4">무엇을 드셨나요? AI가 영양 성분을 분석해 드립니다.</p>
                  
                  <div className="mb-4">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden">
                      {mealImage ? (
                        <img src={mealImage} alt="Meal" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Camera className="w-8 h-8 text-gray-300 mb-2" />
                          <p className="text-xs text-gray-400 font-bold">식단 사진 추가 (선택)</p>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>

                  <textarea 
                    name="mealText"
                    placeholder="예: 닭가슴살 샐러드와 현미밥 한 공기"
                    className="w-full h-24 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 mb-6 text-sm resize-none"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5" />
                        AI로 분석하기
                      </>
                    )}
                  </button>
                </form>
              )}

              {isModalOpen === 'recipe' && (
                <div className="space-y-6">
                  {!recommendedRecipe ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">냉장고에 있는 재료를 입력해주세요. AI가 다이어트 레시피를 추천해드립니다.</p>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={recipeIngredients}
                          onChange={(e) => setRecipeIngredients(e.target.value)}
                          placeholder="예: 닭가슴살, 양배추, 계란"
                          className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 text-sm"
                        />
                        <button 
                          onClick={handleGetRecipe}
                          disabled={isLoading || !recipeIngredients}
                          className="absolute right-2 top-2 p-2 bg-orange-500 text-white rounded-xl disabled:opacity-50"
                        >
                          <Search className="w-5 h-5" />
                        </button>
                      </div>
                      {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                          <p className="text-sm font-bold text-gray-400">AI가 맛있는 레시피를 생각 중입니다...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6 max-h-[60vh] overflow-y-auto pr-2"
                    >
                      <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                        <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">요리 이름</p>
                        <h3 className="text-xl font-bold text-orange-800 mb-2">{recommendedRecipe.name}</h3>
                        <p className="text-[10px] font-bold text-orange-400 uppercase mb-1 mt-4">칼로리 및 영양성분</p>
                        <div className="flex gap-4 text-xs font-bold text-orange-600">
                          <span>{recommendedRecipe.calories} kcal</span>
                          <span>단: {recommendedRecipe.macros.protein}g</span>
                          <span>탄: {recommendedRecipe.macros.carbs}g</span>
                          <span>지: {recommendedRecipe.macros.fat}g</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-bold text-sm flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                          필요 재료
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {recommendedRecipe.ingredients.map((ing, i) => (
                            <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{ing}</span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-bold text-sm flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                          조리 방법
                        </h4>
                        <div className="space-y-3">
                          {recommendedRecipe.instructions.map((step, i) => (
                            <div key={i} className="flex gap-3">
                              <span className="text-orange-500 font-bold text-sm">{i + 1}</span>
                              <p className="text-sm text-gray-600 leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => { setRecommendedRecipe(null); setRecipeIngredients(""); }}
                        className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm"
                      >
                        다른 레시피 찾기
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

              {isModalOpen === 'exercise' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const text = (e.target as any).exerciseText.value;
                  handleAddExercise(text);
                }}>
                  <p className="text-sm text-gray-500 mb-4">어떤 운동을 하셨나요? AI가 소모 칼로리를 계산해 드립니다.</p>
                  <textarea 
                    name="exerciseText"
                    placeholder="예: 스쿼트 100개랑 런닝머신 30분"
                    className="w-full h-32 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 mb-6 text-sm resize-none"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5" />
                        AI로 분석하기
                      </>
                    )}
                  </button>
                </form>
              )}

              {isModalOpen === 'body' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const weight = parseFloat((e.target as any).weight.value);
                  const muscle = parseFloat((e.target as any).muscle.value);
                  const fat = parseFloat((e.target as any).fat.value);
                  const height = parseFloat((e.target as any).height.value);
                  handleAddBody(weight, muscle, fat, height);
                }}>
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">키 (cm)</label>
                        <input name="height" type="number" step="0.1" defaultValue={profile.height} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" required />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">체중 (kg)</label>
                        <input name="weight" type="number" step="0.1" defaultValue={profile.weight} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" required />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">골격근량 (kg)</label>
                      <input name="muscle" type="number" step="0.1" className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">체지방률 (%)</label>
                      <input name="fat" type="number" step="0.1" className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" required />
                    </div>
                  </div>
                  <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold">
                    기록 저장
                  </button>
                </form>
              )}

              {isModalOpen === 'profile' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as any;
                  const name = form.name.value;
                  const height = parseFloat(form.height.value);
                  const age = parseInt(form.age.value);
                  const startWeight = parseFloat(form.startWeight.value);
                  const targetWeight = parseFloat(form.targetWeight.value);
                  const targetDurationWeeks = parseInt(form.targetDurationWeeks.value);
                  const macroRatio = {
                    carbs: parseInt(form.carbs.value),
                    protein: parseInt(form.protein.value),
                    fat: parseInt(form.fat.value)
                  };
                  handleUpdateProfile(name, height, age, startWeight, targetWeight, targetDurationWeeks, macroRatio);
                }}>
                  <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto px-1">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">이름</label>
                      <input name="name" type="text" defaultValue={profile.name} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">키 (cm)</label>
                        <input name="height" type="number" step="0.1" defaultValue={profile.height} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" required />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">나이</label>
                        <input name="age" type="number" defaultValue={profile.age} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">시작 체중 (kg)</label>
                        <input name="startWeight" type="number" step="0.1" defaultValue={profile.startWeight} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" required />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">목표 체중 (kg)</label>
                        <input name="targetWeight" type="number" step="0.1" defaultValue={profile.targetWeight} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" required />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">목표 기간 (주)</label>
                        <input name="targetDurationWeeks" type="number" defaultValue={profile.targetDurationWeeks} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" required />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-400 uppercase block">탄단지 비율 (%)</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <span className="text-[10px] text-orange-500 font-bold mb-1 block">탄</span>
                          <input name="carbs" type="number" defaultValue={profile.macroRatio.carbs} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 text-center" required />
                        </div>
                        <div>
                          <span className="text-[10px] text-blue-500 font-bold mb-1 block">단</span>
                          <input name="protein" type="number" defaultValue={profile.macroRatio.protein} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 text-center" required />
                        </div>
                        <div>
                          <span className="text-[10px] text-yellow-500 font-bold mb-1 block">지</span>
                          <input name="fat" type="number" defaultValue={profile.macroRatio.fat} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-yellow-500 text-center" required />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold">
                    설정 저장
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Badge Unlock Notification */}
      <AnimatePresence>
        {newBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl border-4 border-emerald-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative mb-6">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-emerald-100 rounded-full blur-2xl opacity-50"
                />
                <div className="relative text-7xl mb-4">{newBadge.icon}</div>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">새로운 배지 획득!</h2>
              <p className="text-emerald-600 font-bold text-lg mb-4">[{newBadge.name}]</p>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">{newBadge.description}</p>
              <button 
                onClick={() => setNewBadge(null)}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-colors"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Mobile Feel) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-8 py-4 flex justify-between items-center z-40">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn("flex flex-col items-center gap-1", activeTab === 'dashboard' ? "text-emerald-500" : "text-gray-300")}
        >
          <TrendingUp className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">통계</span>
        </button>
        <button 
          onClick={() => setActiveTab('calendar')}
          className={cn("flex flex-col items-center gap-1", activeTab === 'calendar' ? "text-emerald-500" : "text-gray-300")}
        >
          <CalendarIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">히스토리</span>
        </button>
        <button 
          onClick={() => setActiveTab('body')}
          className={cn("flex flex-col items-center gap-1", activeTab === 'body' ? "text-emerald-500" : "text-gray-300")}
        >
          <Scale className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">신체</span>
        </button>
        <button 
          onClick={() => setActiveTab('badges')}
          className={cn("flex flex-col items-center gap-1", activeTab === 'badges' ? "text-emerald-500" : "text-gray-300")}
        >
          <Award className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">배지</span>
        </button>
      </nav>
    </div>
  );
}
