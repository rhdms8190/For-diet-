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
  ImageIcon,
  Award,
  ChefHat,
  Search,
  X
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

// 유틸리티 및 서비스 함수 (실제 서비스 파일이 없어도 작동하도록 내부에 정의)
const calculateBMR = (w: number, h: number, a: number, g: string) => 
  g === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
const calculateTDEE = (bmr: number, activity: number) => Math.round(bmr * activity);
const calculateBMI = (w: number, h: number) => w / ((h / 100) ** 2);
const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return '저체중';
  if (bmi < 23) return '정상';
  if (bmi < 25) return '과체중';
  return '비만';
};

// 가짜 분석 API (실제 Gemini 연결 전까지 임시 작동)
const analyzeMeal = async (text: string) => {
  await new Promise(r => setTimeout(r, 1500));
  return { name: text, calories: 450, carbs: 50, protein: 30, fat: 15 };
};

const INITIAL_PROFILE = {
  name: '득근이', age: 30, gender: 'male', height: 175, weight: 75,
  targetWeight: 70, targetDurationWeeks: 8, activityLevel: 1.375,
  macroRatio: { carbs: 50, protein: 30, fat: 20 }, unlockedBadges: [], recipeCount: 0
};

export default function App() {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('diet_planner_profile');
    return saved ? JSON.parse(saved) : INITIAL_PROFILE;
  });
  const [mealRecords, setMealRecords] = useState(() => {
    const saved = localStorage.getItem('diet_planner_meals');
    return saved ? JSON.parse(saved) : [];
  });
  const [bodyRecords, setBodyRecords] = useState(() => {
    const saved = localStorage.getItem('diet_planner_body');
    return saved ? JSON.parse(saved) : [];
  });
  const [exerciseRecords, setExerciseRecords] = useState(() => {
    const saved = localStorage.getItem('diet_planner_exercises');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mealInput, setMealInput] = useState("");

  // 수치 계산
  const bmr = useMemo(() => calculateBMR(profile.weight, profile.height, profile.age, profile.gender), [profile]);
  const tdee = useMemo(() => calculateTDEE(bmr, profile.activityLevel), [bmr]);
  const targetCalories = tdee - 500;
  
  const dailySummary = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const meals = mealRecords.filter((m: any) => m.date === dateStr);
    return {
      consumedCalories: meals.reduce((sum: number, m: any) => sum + m.calories, 0),
      protein: meals.reduce((sum: number, m: any) => sum + m.protein, 0),
      carbs: meals.reduce((sum: number, m: any) => sum + m.carbs, 0),
      fat: meals.reduce((sum: number, m: any) => sum + m.fat, 0),
    };
  }, [selectedDate, mealRecords]);

  const handleAddMeal = async () => {
    if (!mealInput) return;
    setIsLoading(true);
    try {
      const analysis = await analyzeMeal(mealInput);
      const newMeal = {
        id: Math.random().toString(36).substr(2, 9),
        date: format(selectedDate, 'yyyy-MM-dd'),
        ...analysis
      };
      setMealRecords((prev: any) => [...prev, newMeal]);
      setMealInput("");
      setIsModalOpen(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const bmi = calculateBMI(profile.weight, profile.height);
  const bmiCategory = getBMICategory(bmi);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <header className="bg-white px-6 pt-8 pb-6 shadow-sm rounded-b-3xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">안녕하세요, {profile.name}님!</h1>
            <p className="text-sm text-gray-500">{format(selectedDate, 'yyyy년 MMMM d일', { locale: ko })}</p>
          </div>
          <button className="p-2 bg-gray-50 rounded-xl"><Settings className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
            <span className="text-[10px] font-bold text-emerald-600">현재 BMI</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{bmi.toFixed(1)}</span>
              <span className="text-xs font-medium text-emerald-700">{bmiCategory}</span>
            </div>
          </div>
          <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
            <span className="text-[10px] font-bold text-blue-600">남은 칼로리</span>
            <p className="text-xl font-bold">{targetCalories - dailySummary.consumedCalories} kcal</p>
          </div>
        </div>
      </header>

      <main className="px-6 mt-8">
        {/* 대시보드 내용 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6 text-center">
           <h2 className="text-lg font-bold mb-4">오늘의 영양 상태</h2>
           <div className="flex justify-center" style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: '탄수화물', value: dailySummary.carbs || 1, color: '#FB923C' },
                    { name: '단백질', value: dailySummary.protein || 1, color: '#60A5FA' },
                    { name: '지방', value: dailySummary.fat || 1, color: '#FACC15' }
                  ]}
                  innerRadius={60} outerRadius={80} dataKey="value"
                >
                  <Cell fill="#FB923C" /><Cell fill="#60A5FA" /><Cell fill="#FACC15" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
           </div>
        </div>
        
        {/* 식단 리스트 */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">오늘의 기록</h2>
          {mealRecords.filter((m: any) => m.date === format(selectedDate, 'yyyy-MM-dd')).map((meal: any) => (
            <div key={meal.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-gray-50">
              <div>
                <p className="font-bold">{meal.name}</p>
                <p className="text-xs text-gray-400">🔥 {meal.calories}kcal | 🥩 P {meal.protein}g</p>
              </div>
              <CheckCircle2 className="text-emerald-500 w-5 h-5" />
            </div>
          ))}
        </div>
      </main>

      {/* 분석 모달 */}
      <AnimatePresence>
        {isModalOpen === 'meal' && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="bg-white w-full max-w-lg rounded-t-[32px] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">식단 분석하기</h2>
                <button onClick={() => setIsModalOpen(null)}><X /></button>
              </div>
              <textarea 
                value={mealInput}
                onChange={(e) => setMealInput(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl mb-4 min-h-[120px]"
                placeholder="예: 오늘 점심에 연어 샐러드랑 아메리카노 마셨어!"
              />
              <button 
                onClick={handleAddMeal}
                disabled={isLoading || !mealInput}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                {isLoading ? "분석 중..." : <><Sparkles className="w-5 h-5" /> AI 분석 및 저장</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button onClick={() => setIsModalOpen('meal')} className="fixed bottom-28 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center">
        <Plus className="w-8 h-8" />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around">
        <button onClick={() => setActiveTab('dashboard')} className="flex flex-col items-center text-emerald-500">
          <Utensils /><span className="text-[10px]">대시보드</span>
        </button>
        <button onClick={() => setActiveTab('calendar')} className="flex flex-col items-center text-gray-300">
          <CalendarIcon /><span className="text-[10px]">기록</span>
        </button>
      </nav>
    </div>
  );
}
