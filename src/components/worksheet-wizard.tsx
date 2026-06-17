'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, FileText, History, Loader2, Sparkles, Crown, RefreshCw } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { GenerateWorksheetOutput, GenerateWorksheetInput } from '@/ai/flows/generate-worksheet';
import { generateWorksheetAction, generateExamPaperAction } from '@/app/actions';
import { exportToPDF, exportAdvancedPDF } from '@/lib/pdf-export';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useUsageTracking } from '@/hooks/use-usage-tracking';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { app } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

const db = getDatabase(app);

// Daily Limit Tracker Component
function DailyLimitTracker() {
  const { remainingGenerations, dailyLimit, usagePercentage, hasReachedLimit } = useUsageTracking();
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">
          Daily Worksheet Generation
        </span>
        <span className="text-sm font-medium">
          {remainingGenerations} of {dailyLimit} remaining
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${hasReachedLimit ? 'bg-red-500' : 'bg-blue-600'}`}
          style={{ width: `${usagePercentage}%` }}
        ></div>
      </div>
      {hasReachedLimit && (
        <p className="mt-1 text-xs text-red-600">
          You've reached your daily limit. Try again tomorrow or upgrade your plan for more.
        </p>
      )}
    </div>
  );
}


// Difficulty Badge Component
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const getColorClass = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy': return 'difficulty-easy';
      case 'medium': return 'difficulty-medium';
      case 'hard': return 'difficulty-hard';
      default: return 'difficulty-medium';
    }
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getColorClass(difficulty)} bounce-in`}>
      {difficulty}
    </span>
  );
}

const formSchema = z.object({
  gradeLevel: z.string().min(1, { message: 'Please select a grade level.' }),
  curriculum: z.string().min(1, { message: 'Please select a curriculum.' }),
  topic: z.string().min(2, { message: 'Topic must be at least 2 characters.' }).max(50, { message: 'Topic must be 50 characters or less.' }),
  difficultyLevel: z.string().min(1, { message: 'Please select a difficulty.' }),
});

type FormValues = z.infer<typeof formSchema>;

export function WorksheetWizard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [worksheetData, setWorksheetData] = useState<GenerateWorksheetOutput | null>(null);
  const [activeTab, setActiveTab] = useState<'creator' | 'history'>('creator');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // Hooks
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    remainingGenerations, 
    hasReachedLimit, 
    incrementWorksheetGeneration,
    dailyLimit,
    usagePercentage 
  } = useUsageTracking();
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gradeLevel: '',
      curriculum: '',
      topic: '',
      difficultyLevel: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (hasReachedLimit) {
        toast({
          title: 'Daily Limit Reached',
          description: 'You have reached your daily worksheet generation limit. Please try again tomorrow or upgrade your plan.',
          variant: 'destructive',
        });
        return;
      }

      setIsGenerating(true);
      setWorksheetData(null);

      // Increment the usage counter before generating the worksheet
      await incrementWorksheetGeneration();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await generateWorksheetAction(user.uid, {
        gradeLevel: values.gradeLevel,
        curriculum: values.curriculum,
        topic: values.topic,
        difficultyLevel: values.difficultyLevel,
      });

      if (response.success && response.data) {
        setWorksheetData(response.data);
      } else {
        throw new Error(response.error || 'Invalid worksheet data received');
      }

      toast({
        title: 'Worksheet generated!',
        description: 'Your worksheet is ready to download.',
      });
    } catch (error) {
      console.error('Error generating worksheet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate worksheet. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async (exportType: 'questions' | 'answers' | 'both' = 'both') => {
    if (!worksheetData) return;
    
    try {
      setIsExportingPDF(true);
      
      // Export based on the selected type
      await exportToPDF(worksheetData, { 
        includeSolutions: exportType !== 'questions',
        includeHeader: true,
        exportType,
        titleSuffix: exportType === 'both' ? 'Questions and Answers' : 
                     exportType === 'questions' ? 'Questions' : 'Answers',
        hideQuestions: exportType === 'answers'
      });
      
      toast({
        title: 'Export successful',
        description: 'Your worksheet has been exported to PDF.',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export worksheet to PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingPDF(false);
    }
  };
  
  const gradeLevels = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7"];
  const curriculums = [
    "CBSE (India)", 
    "IGCSE (Cambridge International)", 
    "IB (International Baccalaureate)", 
    "Singapore Local",
    "Common Core (US)", 
    "IGCSE", 
    "Australian Curriculum", 
    "ICSE (India)", 
    "SSC (India)"
  ];
  const difficulties = ["Easy", "Medium", "Hard"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-1 print:hidden">
        <Card className="education-card sticky top-8 slide-in-right">
          <CardHeader>
             <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="creator"><Sparkles className="mr-2 h-4 w-4"/> Create</TabsTrigger>
                    <TabsTrigger value="history"><History className="mr-2 h-4 w-4"/> History</TabsTrigger>
                </TabsList>
            </Tabs>
          </CardHeader>
            
          {activeTab === 'creator' && (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                 <CardDescription>Fill in the details to generate a custom math worksheet.</CardDescription>
                 
                <DailyLimitTracker />
            
            <FormField
              control={form.control}
              name="gradeLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gradeLevels.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="curriculum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Curriculum</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a curriculum" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {curriculums.map(curriculum => (
                        <SelectItem key={curriculum} value={curriculum}>
                          {curriculum}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Fractions, Algebra, Geometry" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="difficultyLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isGenerating || hasReachedLimit}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : hasReachedLimit ? (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Daily Limit Reached
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Worksheet
                    </>
                  )}
                </Button>
                {hasReachedLimit && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    You've used your daily worksheet generation. Come back tomorrow for more!
                  </p>
                )}
              </CardFooter>
            </form>
          </Form>
          )}

          {activeTab === 'history' && (
            <HistoryView 
                onSelectWorksheet={(data) => {
                    setWorksheetData(data);
                    setActiveTab('creator');
                }}
            />
          )}
        </Card>
        
      
    
      </div>

      <div className="lg:col-span-2">
        <Card className="min-h-[600px] shadow-lg printable-area">
          {isGenerating && <LoadingState />}
          {!isGenerating && worksheetData && (
            <ResultsDisplay 
              data={worksheetData} 
              onPrint={handlePrint} 
              isExportingPDF={isExportingPDF} 
            />
          )}
          {!isGenerating && !worksheetData && <EmptyState />}
        </Card>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <>
      <CardHeader>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
      </CardContent>
    </>
  );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[600px] text-center p-8">
            <div className="floating-animation p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full mb-6">
                <FileText className="h-16 w-16 text-primary" />
            </div>
            <h3 className="educational-header text-3xl font-bold mb-4">Ready to Create Amazing Worksheets?</h3>
            <p className="text-muted-foreground text-lg max-w-lg leading-relaxed">
                Transform learning with AI-powered, personalized math worksheets tailored to any grade level and curriculum.
            </p>
            <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Instant Generation</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Multiple Difficulty Levels</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Answer Keys Included</span>
                </div>
            </div>
        </div>
    )
}

/**
 * Preprocesses mathematical content to convert LaTeX and plain text math into properly formatted HTML
 * with proper mathematical symbols and structure
 */
function preprocessMathContent(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // Handle fractions (LaTeX, simple, and inline)
  result = result.replace(/(?:\\frac\{([^}]+)\}\{([^}]+)\}|(\d+)\/(\d+)|(\d+[\s\d]*)\\s*\/\s*([\d\s]+))/g, 
    (match, latexNum, latexDenom, simpleNum, simpleDenom, altNum, altDenom) => {
      if (latexNum && latexDenom) {
        return `<span class="fraction">
          <span class="numerator">${latexNum}</span>
          <span class="fraction-line">/</span>
          <span class="denominator">${latexDenom}</span>
        </span>`;
      } else if (simpleNum && simpleDenom) {
        return `<span class="fraction">
          <span class="numerator">${simpleNum}</span>
          <span class="fraction-line">/</span>
          <span class="denominator">${simpleDenom}</span>
        </span>`;
      } else if (altNum && altDenom) {
        return `<span class="fraction">
          <span class="numerator">${altNum.trim()}</span>
          <span class="fraction-line">/</span>
          <span class="denominator">${altDenom.trim()}</span>
        </span>`;
      }
      return match;
    }
  );
  
  // Handle exponents and subscripts with better pattern matching
  result = result.replace(/([a-zA-Zα-ωΑ-Ωπ]|\d+)(?:\^\{?([^\s^_\-+*/=(){}[\]]+)\}?|_\{?([^\s^_\-+*/=(){}[\]]+)\}?)?/g, 
    (match, base, exp, sub) => {
      if (exp) return `${base}<sup>${exp}</sup>`;
      if (sub) return `${base}<sub>${sub}</sub>`;
      return base;
    }
  );
  
  // Handle roots with better pattern matching
  result = result.replace(/\\?[√√]\s*\{?([^}\s]+)\}?/g, (match, content) => {
    return `√<span class="radicand">${content}</span>`;
  });
  
  // Handle nth roots
  result = result.replace(/\\?[√√]\s*\[([^\]]+)\]\s*\{?([^}\s]+)\}?/g, (match, degree, content) => {
    return `<span class="root"><sup>${degree}</sup>√<span class="radicand">${content}</span></span>`;
  });
  
  // Handle common mathematical operators and symbols
  const symbolMap: Record<string, string> = {
    // Basic operations
    '\\times': '×', '\\div': '÷', '\\cdot': '·', '\\pm': '±', '\\mp': '∓',
    // Relations
    '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈', '\\equiv': '≡',
    '\\propto': '∝', '\\sim': '∼', '\\simeq': '≃', '\\cong': '≅', '\\ll': '≪', '\\gg': '≫',
    // Greek letters
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
    '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\vartheta': 'ϑ', '\\kappa': 'κ',
    '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\varpi': 'ϖ',
    '\\rho': 'ρ', '\\varrho': 'ϱ', '\\sigma': 'σ', '\\varsigma': 'ς', '\\tau': 'τ',
    '\\upsilon': 'υ', '\\phi': 'φ', '\\varphi': 'ϕ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
    '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ',
    '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Upsilon': 'Υ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
    // Set theory
    '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\subseteq': '⊆', '\\supset': '⊃',
    '\\supseteq': '⊇', '\\cap': '∩', '\\cup': '∪', '\\emptyset': '∅', '\\varnothing': '∅',
    '\\mathbb{R}': 'ℝ', '\\mathbb{N}': 'ℕ', '\\mathbb{Z}': 'ℤ', '\\mathbb{Q}': 'ℚ', '\\mathbb{C}': 'ℂ',
    // Logic
    '\\forall': '∀', '\\exists': '∃', '\\nexists': '∄', '\\neg': '¬', '\\land': '∧',
    '\\lor': '∨', '\\implies': '⇒', '\\iff': '⇔', '\\top': '⊤', '\\bot': '⊥',
    // Arrows
    '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←', '\\leftrightarrow': '↔',
    '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔', '\\mapsto': '↦',
    // Geometry
    '\\angle': '∠', '\\triangle': '△', '\\square': '□', '\\parallel': '∥', '\\perp': '⊥',
    // Calculus
    '\\int': '∫', '\\iint': '∬', '\\iiint': '∭', '\\oint': '∮', '\\partial': '∂',
    '\\nabla': '∇', '\\infty': '∞', '\\lim': 'lim', '\\sum': '∑', '\\prod': '∏',
    '\\coprod': '∐', '\\bigcup': '⋃', '\\bigcap': '⋂', '\\bigoplus': '⨁', '\\bigotimes': '⨂',
    // Misc
    '\\circ': '∘', '\\bullet': '•', '\\ldots': '…', '\\cdots': '⋯',
    '\\vdots': '⋮', '\\ddots': '⋱', '\\prime': '′', '\\ell': 'ℓ', '\\hbar': 'ℏ',
    '\\imath': 'ı', '\\jmath': 'ȷ', '\\Re': 'ℜ', '\\Im': 'ℑ', '\\wp': '℘',
    '\\mho': '℧', '\\surd': '√', '\\dag': '†', '\\ddag': '‡', '\\S': '§',
    '\\P': '¶', '\\copyright': '©', '\\pounds': '£', '\\euro': '€', '\\textyen': '¥',
    '\\textcent': '¢', '\\textdegree': '°', '\\textmu': 'μ', '\\textohm': 'Ω',
    '\\textcelsius': '°C', '\\textperthousand': '‰', '\\textpertenthousand': '‱',
    '\\textmu l': 'μl', '\\textmu g': 'μg', '\\textmu m': 'μm', '\\textmu s': 'μs',
    '\\textmu g/m³': 'μg/m³', '\\textmu g/L': 'μg/L', '\\textmu g/dL': 'μg/dL',
    '\\textmu g/ml': 'μg/ml', '\\textmu g/g': 'μg/g', '\\textmu g/kg': 'μg/kg',
    '\\textmu mol': 'μmol', '\\textmu m/s': 'μm/s', '\\textmu m²': 'μm²', '\\textmu m³': 'μm³',
    '\\textmu F': 'μF', '\\textmu H': 'μH', '\\textmu A': 'μA', '\\textmu V': 'μV',
    '\\textmu W': 'μW', '\\textmu J': 'μJ', '\\textmu N': 'μN', '\\textmu mho': 'μmho',
    '\\textmu g/mg': 'μg/mg', '\\textmu g/m²': 'μg/m²', '\\textmu g/cm³': 'μg/cm³',
    '\\textmu g/μl': 'μg/μl', '\\textmu g/100g': 'μg/100g', '\\textmu g/100ml': 'μg/100ml',
    '\\textmu g/24h': 'μg/24h', '\\textmu g/m²/h': 'μg/m²/h', '\\textmu g/cm²': 'μg/cm²',
    '\\textmu g/cm²/h': 'μg/cm²/h'
  };

  // Replace LaTeX commands with their corresponding symbols
  for (const [cmd, symbol] of Object.entries(symbolMap)) {
    const regex = new RegExp(cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-zA-Z])', 'g');
    result = result.replace(regex, symbol);
  }
  
  // Handle basic operations with proper spacing
  result = result
    .replace(/([0-9a-zA-Z])([+\-×÷=<>])([0-9a-zA-Z])/g, '$1 $2 $3') // Add spaces around operators
    .replace(/([0-9])\s*([a-zA-Z])/g, '$1·$2') // Implied multiplication
    .replace(/([a-zA-Z])\s*([(])/g, '$1$2') // Fix function calls
    .replace(/([0-9])\s*([(])/g, '$1×$2'); // Fix implied multiplication with parentheses
  
  // Handle common functions (sin, cos, tan, log, ln, etc.)
  result = result.replace(/\\(sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|coth|sech|csch|log|ln|lg|exp|lim|max|min|det|gcd|lcm|sup|inf|liminf|limsup|arg|dim|deg|hom|ker|Pr|gcd)(?![a-zA-Z])/g, 
    (match, func) => `<span class="math-function">${func}</span>`
  );
  
  // Handle display style math (centered equations)
  result = result.replace(/\\\[/g, '<div class="math-display">').replace(/\\\]/g, '</div>');
  
  // Handle inline math - fixed regex to properly match LaTeX expressions
  result = result.replace(/\\([^\\]+?)\\/g, (match, math) => {
    try {
      return katex.renderToString(math, { 
        displayMode: false, 
        throwOnError: false,
        strict: false
      });
    } catch (e) {
      console.error('Error rendering LaTeX:', e);
      return math;
    }
  });
  
  // Escape HTML special characters (do this last to avoid escaping our own HTML)
  result = result
    .replace(/&(?!amp;|lt;|gt;|quot;|#039;|#x2F;|#x27;|#x60;|#x2F;|#x3D;|#x5B;|#x5D;|#x7B;|#x7D;|#x2B;|#x2D;|#x2A;|#x2F;|#x5E;|#x3D;|#x3E;|#x3C;|#x21;|#x40;|#x23;|#x24;|#x25;|#x5E;|#x26;|#x28;|#x29;|#x5F;|#x2B;|#x7C;|#x7E;|#x60;|#x5B;|#x5D;|#x7B;|#x7D;|#x5C;|#x3A;|#x3B;|#x22;|#x27;|#x2C;|#x3C;|#x3E;|#x2F;|#x3F;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // Replace multiple spaces with a single space
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

// Function to format math expressions cleanly
const cleanMathForDisplay = (text: string): string => {
  if (!text) return '';
  
  // Convert to superscript
  const toSup = (str: string): string => {
    const sup: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
      'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
      'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
      'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
      'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
      'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
    };
    return str.split('').map(c => sup[c.toLowerCase()] || c).join('');
  };

  // Convert to subscript
  const toSub = (str: string): string => {
    const sub: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
      'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
      'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
      'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
      'v': 'ᵥ', 'x': 'ₓ', 'β': 'ᵦ', 'γ': 'ᵧ', 'ρ': 'ᵨ',
      'φ': 'ᵩ', 'χ': 'ᵪ'
    };
    return str.split('').map(c => sub[c.toLowerCase()] || c).join('');
  };

  // Process mathematical expressions
  const processMath = (str: string): string => {
    // Handle integrals
    str = str.replace(/\\int(_\{([^}]*)\})?\^\{([^}]*)\}/g, (_, sub, from, to) => 
      `∫${from ? toSub(from) : ''}${to ? toSup(to) : ''}`
    );
    
    // Handle exponents with and without braces
    str = str.replace(/\^\{([^}]*)\}/g, (_, exp) => toSup(exp));
    str = str.replace(/\^(\w+)/g, (_, exp) => toSup(exp));
    
    // Handle subscripts with and without braces
    str = str.replace(/_\{([^}]*)\}/g, (_, sub) => toSub(sub));
    str = str.replace(/_([a-zA-Z0-9])/g, (_, sub) => toSub(sub));
    
    // Handle any remaining carets
    str = str.replace(/\^/g, '');
    
    return str;
  };

  // Process the text
  let result = processMath(text);
  
  // Handle other math expressions
  result = result
    // Handle fractions
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    // Handle all variations of square roots - case insensitive and with/without backslashes
    .replace(/(\\?sqrt)\(([^)]*)\)/gi, '√($2)')
    .replace(/(\\?sqrt)\s*\(([^)]*)\)/gi, '√($2)')
    .replace(/(\\?sqrt)\s*\{([^{}]*)\}/gi, '√($2)')
    .replace(/(\\?sqrt)\s*\[([^\]]*)\]/gi, '√($2)')
    .replace(/sqrt/gi, '√')
    // Handle multiplication
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    // Handle division
    .replace(/\\div/g, '÷')
    // Handle Greek letters and other symbols
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ');

  // Clean up
  result = result
    .replace(/\\[a-zA-Z]+/g, '')  // Remove any remaining LaTeX commands
    .replace(/[{}]/g, '')          // Remove curly braces
    .replace(/\\/g, '')           // Remove backslashes
    .replace(/\$/g, '')           // Remove $ signs
    .replace(/\s*=\s*/g, ' = ')   // Normalize spaces around =
    .replace(/\s*\+\s*/g, ' + ')  // Normalize spaces around +
    .replace(/\s*\-\s*/g, ' - ')  // Normalize spaces around -
    .replace(/\s*\*\s*/g, '·')    // Use · for multiplication
    .replace(/\s*\/\s*/g, '/')    // Normalize division
    .replace(/\s+/g, ' ')         // Normalize spaces
    .trim();

  // Final cleanup
  result = result
    .replace(/\(\s+/g, '(')     // Remove spaces after (
    .replace(/\s+\)/g, ')')     // Remove spaces before )
    .replace(/\(\)/g, '')       // Remove empty parentheses
    .replace(/\s*,\s*/g, ', ');  // Normalize comma spacing

  return result;
};

// Format solution into steps
const formatSolutionSteps = (solution: string): string[] => {
  if (!solution) return [];
  // Split by common step indicators
  return solution
    .split(/(\n|\r\n|\r|\d+\.\s*|Step\s*\d+:?\s*)/)
    .filter(step => step.trim() && !/^\d+\.?\s*$/.test(step) && !/^Step\s*\d+:?\s*$/i.test(step))
    .map(step => step.trim());
};

const ParsedContent = ({ content }: { content: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current || !content) return;
    
    const processContent = () => {
      // Clean the content first
      const cleanedContent = cleanMathForDisplay(content);
      
      // Create a temporary container
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanedContent
        .replace(/\n/g, '<br>') // Preserve line breaks
        .replace(/\$\$(.*?)\$\$/g, '<span class="math">$1</span>') // Block math
        .replace(/\$(.*?)\$/g, '<span class="math">$1</span>'); // Inline math
      
      // Process any remaining math-like content
      const mathElements = tempDiv.querySelectorAll('.math');
      mathElements.forEach(el => {
        if (el.textContent) {
          el.textContent = cleanMathForDisplay(el.textContent);
        }
      });
      
      // Update the container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(tempDiv);
      }
    };
    
    processContent();
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className="math-content whitespace-pre-wrap font-sans text-base leading-relaxed space-y-4"
    />
  );
};

// Add display name for debugging
ParsedContent.displayName = 'ParsedContent';

const ResultsDisplay = ({ 
  data, 
  onPrint, 
  isExportingPDF 
}: { 
  data: GenerateWorksheetOutput; 
  onPrint: (exportType?: 'questions' | 'answers' | 'both') => void; 
  isExportingPDF: boolean;
}) => {
  const [activeTab, setActiveTab] = useState('worksheet');

  return (
    <div className="w-full">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Generated Worksheet</CardTitle>
            <CardDescription>View the problems and solutions below.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => onPrint('questions')} 
              variant="outline" 
              size="sm" 
              className="print:hidden flex items-center gap-2"
              disabled={isExportingPDF}
            >
              <Download className="h-4 w-4" />
              Questions
            </Button>
            <Button 
              onClick={() => onPrint('answers')} 
              variant="default" 
              size="sm" 
              className="print:hidden flex items-center gap-2"
              disabled={isExportingPDF}
            >
              <Download className="h-4 w-4" />
              Answers
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 print:hidden">
              <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
              <TabsTrigger value="solutions">Answer Key</TabsTrigger>
            </TabsList>
            <div className="mt-6 space-y-8">
              {data.questions.map((q: any, index: number) => (
                <div key={index} className="border-t pt-6 first:border-t-0 first:pt-0 break-inside-avoid">
                  <h3 className="font-bold text-lg mb-2">Question {index + 1}</h3>
                  <div className="prose max-w-none">
                    <ParsedContent content={q.problem} />
                  </div>
                  
                  {q.figureUrl && (
                    <div className="my-4">
                      <div className="rounded-md border overflow-hidden max-w-sm">
                        <Image 
                          src={q.figureUrl} 
                          alt={`Figure for question ${index + 1}`} 
                          width={400} 
                          height={300} 
                          className="w-full object-cover"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground italic mt-1">
                        Note: Please draw the figure in your worksheet as needed.
                      </p>
                    </div>
                  )}
                  
                  <div className={`mt-4 ${activeTab === 'solutions' ? 'block' : 'hidden print:block'}`}>
                    <h4 className="font-semibold text-md mb-2 text-primary">Solution</h4>
                    <div className="prose max-w-none text-sm bg-stone-50 p-4 rounded-md border space-y-2">
                      {formatSolutionSteps(q.solution).map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-stone-500 font-medium">{i + 1}.</span>
                          <ParsedContent content={step} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

interface HistoryItem {
    id: string;
    createdAt: number;
    input: GenerateWorksheetInput;
    output: GenerateWorksheetOutput;
}

function HistoryView({ onSelectWorksheet }: { onSelectWorksheet: (data: GenerateWorksheetOutput) => void }) {
    const { user } = useAuth();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const historyQuery = query(
            ref(db, `worksheets/${user.uid}`),
            orderByChild('createdAt'),
            limitToLast(10)
        );

        const unsubscribe = onValue(historyQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const parsedHistory: HistoryItem[] = Object.entries(data)
                    .map(([id, value]: [string, any]) => ({ id, ...value }))
                    .sort((a, b) => b.createdAt - a.createdAt);
                setHistory(parsedHistory);
            } else {
              setHistory([]);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (isLoading) {
        return <CardContent><Skeleton className="h-20 w-full" /></CardContent>;
    }

    if (!user) {
        return <CardContent><p className="text-center text-muted-foreground p-4">Please log in to see your history.</p></CardContent>;
    }
    
    if (history.length === 0) {
        return <CardContent><p className="text-center text-muted-foreground p-4">No history yet. Generate a worksheet to get started!</p></CardContent>
    }

    return (
        <CardContent className="p-0">
            <div className="space-y-2 p-2">
                {history.map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => onSelectWorksheet(item.output)}
                        className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors"
                    >
                        <p className="font-semibold truncate">{item.input.topic}</p>
                        <p className="text-sm text-muted-foreground">{item.input.gradeLevel} &middot; {item.input.difficultyLevel}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </p>
                    </button>
                ))}
            </div>
        </CardContent>
    );
}
