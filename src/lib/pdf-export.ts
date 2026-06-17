'use client';

import type { GenerateWorksheetOutput } from '@/ai/flows/generate-worksheet';

export interface PDFExportOptions {
  includeSolutions: boolean;
  includeHeader: boolean;
  watermark?: string;
}

export async function exportToPDF(
  worksheetData: GenerateWorksheetOutput, 
  options: PDFExportOptions & { 
    exportType?: 'questions' | 'answers' | 'both',
    titleSuffix?: string,
    hideQuestions?: boolean
  } = { 
    includeSolutions: true, 
    includeHeader: true,
    exportType: 'both',
    hideQuestions: false
  }
): Promise<boolean> {
  try {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // If popup is blocked, show a message to the user
      if (window.confirm('Please allow popups for this site to enable PDF export. Click OK to continue.')) {
        // User acknowledged, try again
        return exportToPDF(worksheetData, options);
      }
      return false;
    }

    // Generate HTML content
    const htmlContent = generateWorksheetHTML(worksheetData, {
      ...options,
      titleSuffix: options.titleSuffix || (options.exportType === 'questions' ? ' - Questions' : ' - Answers')
    });

    // Write content to the new window
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for the content to load
    return new Promise((resolve) => {
      printWindow.onload = () => {
        try {
          // Small delay to ensure all content is rendered
          setTimeout(() => {
            printWindow.print();
            resolve(true);
          }, 500);
        } catch (error) {
          console.error('Error during print:', error);
          resolve(false);
        }
      };
    });
  } catch (error) {
    console.error('Error in exportToPDF:', error);
    return false;
  }
}

async function exportAnswersPDF(worksheetData: GenerateWorksheetOutput, options: PDFExportOptions) {
  const answersWindow = window.open('', '_blank');
  if (!answersWindow) {
    throw new Error('Unable to open print window for answers. Please check your popup blocker.');
  }
  
  const answersHTML = generateWorksheetHTML(worksheetData, {
    ...options,
    includeSolutions: true,
    titleSuffix: ' - Answer Key',
    hideQuestions: true
  });
  
  answersWindow.document.write(answersHTML);
  answersWindow.document.close();
  
  answersWindow.onload = () => {
    setTimeout(() => {
      answersWindow.print();
      answersWindow.close();
    }, 250);
  };
}

// Helper function to convert LaTeX to clean math expressions for PDF
export function cleanMathContent(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // First, handle all LaTeX commands that might contain nested braces
  const processNested = (str: string): string => {
    // Handle nested fractions first
    let processed = str.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, num, denom) => {
      return `(${processNested(num)})/(${processNested(denom)})`;
    });
    
    // Handle exponents with nested content
    processed = processed.replace(/\^\{([^{}]*)\}/g, (_, exp) => `^${processNested(exp)}`);
    
    // Handle subscripts with nested content
    processed = processed.replace(/_\{([^{}]*)\}/g, (_, sub) => `_${processNested(sub)}`);
    
    return processed;
  };
  
  // Process nested structures first
  result = processNested(result);
  
  // Handle simple fractions (after processing nested ones)
  result = result.replace(/(\d+)\/(\d+)/g, (_, num, denom) => `${num}/${denom}`);
  
  // Handle exponents and subscripts (simplified)
  result = result.replace(/([a-zA-Zα-ωΑ-Ωπ0-9]+)\^([a-zA-Zα-ωΑ-Ωπ0-9]+)/g, '$1^$2')
                .replace(/([a-zA-Zα-ωΑ-Ωπ0-9]+)_([a-zA-Zα-ωΑ-Ωπ0-9]+)/g, '$1_$2');
  
  // Handle square roots
  result = result.replace(/\\?sqrt\s*\{?([^}\s]+)\}/g, '√$1');
  
  // Handle nth roots
  result = result.replace(/\\?sqrt\s*\[([^\]]+)\]\s*\{?([^}\s]+)\}/g, '$1√$2');
  
  // Common math symbols mapping - using the same as in worksheet wizard
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
    '\\mho': '℧', '\\surd': '√', '\\dag': '†', '\\ddag': '‡',
    '\\S': '§', '\\P': '¶', '\\copyright': '©', '\\pounds': '£', '\\euro': '€', '\\textyen': '¥',
    '\\textcent': '¢', '\\textdegree': '°', '\\textmu': 'µ', '\\textohm': 'Ω',
    '\\textcelsius': '°C', '\\textperthousand': '‰', '\\textpertenthousand': '‱',
    // Units
    '\\textmu l': 'μl', '\\textmu g': 'μg', '\\textmu m': 'μm', '\\textmu s': 'μs',
    '\\textmu g/m³': 'μg/m³', '\\textmu g/L': 'μg/L', '\\textmu g/dL': 'μg/dL',
    '\\textmu g/ml': 'μg/ml', '\\textmu g/g': 'μg/g', '\\textmu g/kg': 'μg/kg',
    '\\textmu mol': 'μmol', '\\textmu m/s': 'μm/s', '\\textmu m²': 'μm²', '\\textmu m³': 'μm³',
    '\\textmu F': 'μF', '\\textmu H': 'μH', '\\textmu A': 'μA', '\\textmu V': 'μV',
    '\\textmu W': 'μW', '\\textmu J': 'μJ', '\\textmu N': 'μN', '\\textmu mho': 'μmho',
    // Cleanup
    '\\left': '', '\\right': '', '\\,': ' ', '\\;': ' ', '\\!': '', '\\:': ' ',
    '\\(': '(', '\\)': ')', '\\[': '', '\\]': '', '\\{': '', '\\}': ''
  };

  // Replace all symbols in the result with proper escaping
  const sortedSymbols = Object.entries(symbolMap)
    .sort(([a], [b]) => b.length - a.length); // Sort by length to match longer patterns first

  for (const [key, value] of sortedSymbols) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use word boundary or non-letter character after the symbol
    const regex = new RegExp(escapedKey + '(?![a-zA-Z])', 'g');
    result = result.replace(regex, value);
  }

  // Clean up any remaining LaTeX and normalize spacing
  result = result
    .replace(/\$/g, '')  // Remove $ signs
    .replace(/\\/g, '')  // Remove remaining backslashes
    .replace(/[{}]/g, '') // Remove all braces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Final cleanup and formatting with better handling of mathematical expressions
  return result
    .replace(/\(\s+/g, '(')  // Remove spaces after (
    .replace(/\s+\)/g, ')')  // Remove spaces before )
    .replace(/\(\)/g, '')    // Remove empty parentheses
    // Handle multiplication between number and variable (2x → 2·x)
    .replace(/(\d)([a-zA-Zα-ω])/g, '$1·$2')
    .replace(/([a-zA-Zα-ω])(\d)/g, '$1·$2')
    // Handle fractions and division
    .replace(/([a-zA-Zα-ω])\s*\/\s*(\d+|[a-zA-Zα-ω])/g, '$1/$2')
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2')
    // Clean up any remaining oddities
    .replace(/·+/g, '·')  // Remove duplicate ·
    .replace(/([·/])\s*([·/])/g, '$1$2') // Remove spaces between operators
    .replace(/\s*([=+\-×÷])\s*/g, ' $1 ') // Normalize spaces around operators
    // Final cleanup of any remaining artifacts
    .replace(/\s+([.,;:!?])/g, '$1')  // Remove space before punctuation
    .replace(/([a-zA-Z])\s+([a-zA-Z])/g, '$1 $2') // Ensure space between words
    .replace(/([0-9])\s+([0-9])/g, '$1$2'); // Remove spaces between digits
}

// Function to format solution steps with step numbers
function formatSolutionSteps(solution: string): string {
  // Split by common step indicators
  const steps = solution.split(/(\n|\r\n|\r|\d+\.\s*|Step\s*\d+:?\s*)/)
    .filter(step => step.trim() && !/^\d+\.?\s*$/.test(step) && !/^Step\s*\d+:?\s*$/i.test(step));
  
  // Format each step with a number
  return steps.map((step, index) => 
    `<div style="margin: 8px 0; padding-left: 15px; border-left: 2px solid #E5E7EB;">
       <span style="color: #6B7280; font-weight: bold;">${index + 1}.</span> ${step.trim()}
     </div>`
  ).join('');
}

function generateWorksheetHTML(
  data: GenerateWorksheetOutput, 
  options: PDFExportOptions & { titleSuffix?: string; hideQuestions?: boolean }
): string {
  const { includeSolutions, includeHeader, watermark } = options;
  
  const title = `ImproMaths Worksheet${options.titleSuffix || ''}`;
  
  const headerHTML = includeHeader ? `
    <div class="worksheet-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3B82F6; padding-bottom: 15px;">
      <h1 style="color: #3B82F6; margin: 0; font-size: 28px; font-weight: bold;">${title}</h1>
      <p style="margin: 5px 0; color: #6B7280; font-size: 14px;">Generated on ${new Date().toLocaleDateString()}</p>
      ${watermark ? `<p style="margin: 5px 0; color: #9CA3AF; font-size: 12px;">${watermark}</p>` : ''}
    </div>
  ` : '';

  const questionsHTML = data.questions.map((question, index) => `
    <div class="question-block" style="margin-bottom: 40px; page-break-inside: avoid;">
      <h3 style="color: #1F2937; font-size: 18px; font-weight: bold; margin: 0 0 15px 0;">
        Question ${index + 1}
      </h3>
      ${!options.hideQuestions ? `
        <div class="question-content" style="margin-bottom: 20px; line-height: 1.6; color: #374151; font-family: 'Arial', sans-serif;">
          ${cleanMathContent(question.problem).replace(/\n/g, '<br>')}
        </div>
      ` : ''}
      
      ${question.figureDescription ? `
        <div class="figure-description" style="margin: 15px 0; padding: 12px; background-color: #F3F4F6; border-left: 4px solid #3B82F6; border-radius: 4px; font-style: italic; color: #1F2937;">
          <strong>Figure ${index + 1}:</strong> ${question.figureDescription}
        </div>
      ` : ''}
      
      ${includeSolutions ? `
        <div class="solution-section" style="margin-top: ${options.hideQuestions ? '0' : '25px'}; padding: 15px; background-color: ${options.hideQuestions ? '#FFFFFF' : '#F9FAFB'}; border-left: 4px solid #10B981; border-radius: 4px;">
          ${options.hideQuestions ? `
            <h3 style="color: #1F2937; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">
              Question ${index + 1}
            </h3>
            <div class="question-content" style="margin-bottom: 15px; line-height: 1.6; color: #374151;">
              ${cleanMathContent(question.problem).replace(/\n/g, '<br>')}
            </div>
          ` : ''}
          <h4 style="color: #10B981; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">
            ${options.hideQuestions ? 'Answer' : 'Solution'}:
          </h4>
          <div style="color: #374151; line-height: 1.5; font-size: 14px; font-family: 'Arial', sans-serif;">
            ${formatSolutionSteps(cleanMathContent(question.solution))}
          </div>
        </div>
      ` : !options.hideQuestions ? `
        <div class="answer-space" style="margin-top: 20px; border: 1px dashed #D1D5DB; height: 80px; border-radius: 4px;">
          <p style="color: #9CA3AF; font-size: 12px; padding: 10px; margin: 0;">Answer:</p>
        </div>
      ` : ''}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Arial', 'Segoe UI', system-ui, -apple-system, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 30px 40px 40px 40px;
          color: #1F2937;
          background: white;
          font-size: 14px;
        }
        
        /* Math equation styling */
        .math {
          font-family: 'Arial', sans-serif;
          white-space: nowrap;
          letter-spacing: 0.5px;
        }
        
        /* Ensure proper spacing around math elements */
        .math + .math {
          margin-left: 2px;
        }
        
        /* Fractions */
        .fraction {
          display: inline-flex;
          flex-direction: column;
          text-align: center;
          vertical-align: middle;
          margin: 0 0.2em;
        }
        .fraction-line {
          border-top: 1px solid #000;
          margin: 0.1em 0;
        }
        
        /* Exponents and subscripts */
        .sup, .sub {
          font-size: 0.8em;
          position: relative;
          line-height: 1;
          vertical-align: baseline;
        }
        .sup {
          top: -0.5em;
        }
        .sub {
          bottom: -0.5em;
        }
        
        @media print {
          body { margin: 20px; }
          .question-block { page-break-inside: avoid; }
        }
        
        h1, h2, h3, h4 { margin-top: 0; }
        
        .worksheet-header {
          border-bottom: 2px solid #3B82F6;
          padding-bottom: 15px;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .question-block {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        
        .solution-section {
          margin-top: 20px;
          padding: 15px;
          background-color: #F9FAFB;
          border-left: 4px solid #10B981;
          border-radius: 4px;
        }
        
        .answer-space {
          margin-top: 20px;
          border: 1px dashed #D1D5DB;
          height: 80px;
          border-radius: 4px;
        }
        
        img {
          max-width: 100%;
          height: auto;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      ${headerHTML}
      <div class="disclaimer" style="margin-bottom: 20px; padding: 12px; background-color: #FFFBEB; border: 1px solid #F59E0B; border-radius: 6px; font-family: Arial, sans-serif;">
        <p style="margin: 0 0 8px 0; color: #92400E; font-size: 13px; line-height: 1.4; font-weight: bold;">
          📝 <u>Important Note:</u>
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #92400E; font-size: 13px; line-height: 1.5;">
          <li>Draw all figures yourself in the spaces provided - do not rely on the generated images.</li>
          <li>Show all your working clearly for full marks.</li>
          <li>Use a pencil for diagrams and working, and pen for final answers.</li>
          <li>If you see any special characters (like $, ^, /, etc.), please interpret them as standard mathematical notation.</li>
        </ul>
      </div>
      <div class="worksheet-content">
        ${questionsHTML}
      </div>
    </body>
    </html>
  `;
}

// Enhanced PDF export with more options for Silver/Gold users
export async function exportAdvancedPDF(
  worksheetData: GenerateWorksheetOutput,
  customOptions: {
    title?: string;
    subtitle?: string;
    includeSolutions: boolean;
    includeMetadata: boolean;
    customStyling?: string;
    format?: 'A4' | 'Letter';
  }
): Promise<boolean> {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      if (window.confirm('Please allow popups for this site to enable PDF export. Click OK to continue.')) {
        return exportAdvancedPDF(worksheetData, customOptions);
      }
      return false;
    }

    // Generate HTML with custom options
    const html = generateWorksheetHTML(worksheetData, {
      includeSolutions: customOptions.includeSolutions,
      includeHeader: customOptions.includeMetadata,
      watermark: customOptions.title || 'Generated Worksheet',
      titleSuffix: customOptions.title ? '' : ' - Custom Export'
    });

    return new Promise((resolve) => {
      printWindow.document.write(html);
      printWindow.document.close();
      
      printWindow.onload = () => {
        try {
          // Small delay to ensure content is loaded before printing
          setTimeout(() => {
            printWindow.print();
            resolve(true);
          }, 500);
        } catch (error) {
          console.error('Error during advanced print:', error);
          resolve(false);
        }
      };
    });
  } catch (error) {
    console.error('Error in exportAdvancedPDF:', error);
    return false;
  }
}
