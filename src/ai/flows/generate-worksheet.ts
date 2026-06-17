'use server';

/**
 * @fileOverview A math worksheet generation AI agent with additional features of Silver and Gold subscription tiers.
 * Gold users can generate full-length exam-style question papers.
 *
 * - generateWorksheet - A function that handles the worksheet generation process for regular users.
 * - generateGoldWorksheet - A function that handles full-length exam paper generation for Gold users.
 * - GenerateWorksheetInput - The input type for the generateWorksheet function.
 * - GenerateWorksheetOutput - The return type for the generateWorksheet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWorksheetInputSchema = z.object({
  gradeLevel: z.string().describe('The grade level of the worksheet.'),
  curriculum: z.string().describe('The curriculum of the worksheet.'),
  topic: z.string().describe('The math topic of the worksheet.'),
  difficultyLevel: z.string().describe('The difficulty level of the worksheet (e.g., easy, medium, hard).'),
});
export type GenerateWorksheetInput = z.infer<typeof GenerateWorksheetInputSchema>;

const QuestionSchema = z.object({
  problem: z.string().describe('The math problem.'),
  figurePrompt: z.string().optional().describe('A clear and concise description of any geometric figure or diagram that would help understand the problem. Include all necessary measurements, labels, and relationships. Example: "A right triangle ABC with right angle at B, where AB = 3 units, BC = 4 units, and AC is the hypotenuse. Points A, B, and C are labeled in order."'),
  solution: z.string().describe('The step-by-step solution to the problem. All calculations must be double-checked for 100% accuracy.'),
  figureDescription: z.string().optional().describe('A detailed description of the figure that would help visualize the problem. This will be used instead of generating an actual figure.'),
});

const GenerateWorksheetOutputSchema = z.object({
  questions: z.array(QuestionSchema).describe('An array of 10 math problems with solutions.'),
});
export type GenerateWorksheetOutput = z.infer<typeof GenerateWorksheetOutputSchema>;

const worksheetGenerationPrompt = ai.definePrompt({
    name: 'generateWorksheetPrompt',
    input: {schema: GenerateWorksheetInputSchema},
    output: {schema: GenerateWorksheetOutputSchema},
    prompt: `You are an expert math teacher and curriculum designer with a very high standard for accuracy. Your primary goal is to create flawless, engaging math worksheets. Your work must be 100% accurate.

  Generate a worksheet with 10 problems based on the following parameters:
  
  Grade Level: {{{gradeLevel}}}
  Curriculum: {{{curriculum}}}
  Topic: {{{topic}}}
  Difficulty Level: {{{difficultyLevel}}}
  
  For each problem:
  1. Create a clear and concise math problem that is appropriate for the specified grade and difficulty.
  2. **MATHEMATICAL NOTATION RULES (MUST FOLLOW STRICTLY):**
     - Use proper mathematical symbols: √, ×, ÷, ±, ≤, ≥, ≠, ≈, ∠, ∥, ⊥, π, ∞, →, ↔, Σ, Δ, θ, α, β, γ, δ
     - Never spell out operations (no "square root of", "times", "divide", "greater than")
     - For fractions, use proper notation: ¾ or (3/4) if spacing requires
     - For exponents, use superscript: x² not x^2
     - For roots, use √ symbol: √9 = 3, not sqrt(9) = 3
     - For angles, use degree symbol: 90°
     - For equations, use proper equals sign: 2 + 2 = 4
     - For inequalities: x > 5, y ≤ 10
     - For fractions in equations: (x + 1)/(x - 1)
     - For square roots: √(x² + y²)
     - For powers: x³ - 2x² + x - 6 = 0
  
  3. **FIGURE REQUIREMENTS:**
     - If a visual aid is essential, provide a clear and detailed description of the figure
     - Include all necessary measurements, labels, and relationships between elements
     - For geometric shapes, specify all side lengths, angles, and any other relevant properties
     - For coordinate geometry problems, describe the positions of points and shapes
     - For word problems, describe any relevant diagrams that would help understand the scenario
  
  4. **SOLUTION REQUIREMENTS:**
     - Provide step-by-step solutions showing all work
     - Use proper mathematical notation throughout
     - Double-check all calculations for 100% accuracy
     - Include units where applicable
     - Box final answers when appropriate
  
  Example Problem Format:
  
  **Q1.** Solve for x: 3x² − 5x − 2 = 0  
  **Solution:**  
  Using the quadratic formula,  
  x = [5 ± √(25 + 24)] ÷ 6  
  x = [5 ± √49] ÷ 6  
  x = [5 ± 7] ÷ 6  
  ∴ x = 2 or x = −⅓  
  
  **Figure Description:** A parabola opening upwards with vertex at (5/6, -49/12), x-intercepts at x = -⅓ and x = 2, and y-intercept at (0, -2). The axis of symmetry is x = 5/6.
  
  Ensure all problems follow this format and maintain the highest standard of mathematical accuracy.`,
  });

// Gold user schemas for 25 question exam papers 
const GoldGenerateWorksheetOutputSchema = z.object({
  questions: z.array(QuestionSchema).describe('An array of 25 math problems with solutions for exam-style papers.'),
});
export type GoldGenerateWorksheetOutput = z.infer<typeof GoldGenerateWorksheetOutputSchema>;

const goldWorksheetGenerationPrompt = ai.definePrompt({
  name: 'goldGenerateWorksheetPrompt',
  input: {schema: GenerateWorksheetInputSchema},
  output: {schema: GoldGenerateWorksheetOutputSchema},
  prompt: `You are an expert math teacher and curriculum designer with a very high standard for accuracy. Your primary goal is to create flawless, engaging exam-style question papers. Your work must be 100% accurate.

Generate a full-length exam paper with 25 problems based on the following parameters:

Grade Level: {{{gradeLevel}}}
Curriculum: {{{curriculum}}}
Topic: {{{topic}}}
Difficulty Level: {{{difficultyLevel}}}}

For each problem:
1. Create a clear and concise math problem that is appropriate for the specified grade and difficulty.
2. **MATHEMATICAL NOTATION RULES (MUST FOLLOW STRICTLY):**
   - Use proper mathematical symbols: √, ×, ÷, ±, ≤, ≥, ≠, ≈, ∠, ∥, ⊥, π, ∞, →, ↔, Σ, Δ, θ, α, β, γ, δ
   - Never spell out operations (no "square root of", "times", "divide", "greater than")
   - For fractions, use proper notation: ¾ or (3/4) if spacing requires
   - For exponents, use superscript: x² not x^2
   - For roots, use √ symbol: √9 = 3, not sqrt(9) = 3
   - For angles, use degree symbol: 90°
   - For equations, use proper equals sign: 2 + 2 = 4
   - For inequalities: x > 5, y ≤ 10
   - For fractions in equations: (x + 1)/(x - 1)
   - For square roots: √(x² + y²)
   - For powers: x³ - 2x² + x - 6 = 0

3. **FIGURE REQUIREMENTS:**
   - If a visual aid is essential, provide a detailed prompt for generating a mathematical figure
   - Include exact measurements, labels, and any necessary annotations
   - Specify if a coordinate grid is needed
   - Use professional math textbook style

4. **SOLUTION REQUIREMENTS:**
   - Provide step-by-step solutions showing all work
   - Use proper mathematical notation throughout
   - Double-check all calculations for 100% accuracy
   - Include units where applicable
   - Box final answers when appropriate
   - Show all intermediate steps clearly
   - Include explanations for key steps when necessary

5. **EXAM STRUCTURE:**
   - Start with easier problems and gradually increase difficulty
   - Include a variety of problem types within the topic
   - Ensure comprehensive coverage of the curriculum
   - Include word problems that apply concepts to real-world scenarios
   - Mix computational and conceptual questions

Example Problem Format:

**Q1.** Solve for x: 3x² − 5x − 2 = 0  
**Solution:**  
Using the quadratic formula,  
x = [5 ± √(25 + 24)] ÷ 6  
x = [5 ± √49] ÷ 6  
x = [5 ± 7] ÷ 6  
∴ x = 2 or x = −⅓  

**Figure:** (Graph the parabola y = 3x² − 5x − 2 showing roots at x = −⅓ and x = 2)

Ensure all problems follow this format and maintain the highest standard of mathematical accuracy.`,
});

export async function generateWorksheet(input: GenerateWorksheetInput): Promise<GenerateWorksheetOutput> {
    const { output } = await worksheetGenerationPrompt(input);
    if (!output) {
      throw new Error('Failed to generate worksheet content.');
    }
  
    // Generate figures for questions that have a figure prompt with enhanced accuracy
    const questionsWithFigures = await Promise.all(
      output.questions.map(async (question, index) => {
        if (question.figurePrompt) {
          try {
      // Enhanced prompt with explicit instructions
      const enhancedPrompt = `Create an educational math diagram with the following specifications: ${question.figurePrompt}.
      Specifications:
      1. Quality: Professional textbook standard
      2. Background: Plain white
      3. Lines & Text: Sharp black
      4. Notation: Accurate symbols and notation
      5. Measurements: Exact and precise
      6. Colors: Blue for given values, red for unknowns
      7. Structure: Grid lines or coordinate system included when necessary
      8. Clarity: High contrast for clear visibility
      9. Decor: None; only educational content
      10. Accuracy: Mathematical precision is paramount
      11. Scale: Maintain precise proportions
      12. Units: Include clear unit markers
      13. Labels: All elements clearly labeled
      14. Perspective: Use standard mathematical viewing angles
      15. Validation: Ensure all measurements and angles are mathematically correct`;

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: enhancedPrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          temperature: 0.05, // Further reduced temperature for even more consistency
        },
      });
            
            if (media?.url) {
              console.log(`✅ Image generated successfully for question ${index + 1}:`, media.url);
              return { ...question, figureUrl: media.url };
            } else {
              console.warn(`⚠️ No image URL returned for question ${index + 1}`);
              return { ...question, figureUrl: null };
            }
          } catch (error) {
            console.error(`❌ Image generation failed for question ${index + 1}:`, question.figurePrompt, error);
            // Don't block the whole worksheet if one image fails
            return { ...question, figureUrl: null };
          }
        }
        return { ...question, figureUrl: null };
      })
    );
  
    return { questions: questionsWithFigures };
  }
  
// Gold worksheet generation function for exam papers
export async function generateGoldWorksheet(input: GenerateWorksheetInput): Promise<GoldGenerateWorksheetOutput> {
    const { output } = await goldWorksheetGenerationPrompt(input);
    if (!output) {
      throw new Error('Failed to generate Gold exam paper content.');
    }
  
    // Generate figures for questions that have a figure prompt with enhanced accuracy
    const questionsWithFigures = await Promise.all(
      output.questions.map(async (question, index) => {
        if (question.figurePrompt) {
          try {
      // Enhanced prompt with explicit instructions
      const enhancedPrompt = `Create an educational math diagram with the following specifications: ${question.figurePrompt}.
      Specifications:
      1. Quality: Professional textbook standard
      2. Background: Plain white
      3. Lines & Text: Sharp black
      4. Notation: Accurate symbols and notation
      5. Measurements: Exact and precise
      6. Colors: Blue for given values, red for unknowns
      7. Structure: Grid lines or coordinate system included when necessary
      8. Clarity: High contrast for clear visibility
      9. Decor: None; only educational content
      10. Accuracy: Mathematical precision is paramount
      11. Scale: Maintain precise proportions
      12. Units: Include clear unit markers
      13. Labels: All elements clearly labeled
      14. Perspective: Use standard mathematical viewing angles
      15. Validation: Ensure all measurements and angles are mathematically correct`;

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: enhancedPrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          temperature: 0.05, // Further reduced temperature for even more consistency
        },
      });
            
            if (media?.url) {
              console.log(`✅ Image generated successfully for Gold exam question ${index + 1}:`, media.url);
              return { ...question, figureUrl: media.url };
            } else {
              console.warn(`⚠️ No image URL returned for Gold exam question ${index + 1}`);
              return { ...question, figureUrl: null };
            }
          } catch (error) {
            console.error(`❌ Image generation failed for Gold exam question ${index + 1}:`, question.figurePrompt, error);
            // Don't block the whole worksheet if one image fails
            return { ...question, figureUrl: null };
          }
        }
        return { ...question, figureUrl: null };
      })
    );
  
    return { questions: questionsWithFigures };
  }

const generateWorksheetFlow = ai.defineFlow(
  {
    name: 'generateWorksheetFlow',
    inputSchema: GenerateWorksheetInputSchema,
    outputSchema: GenerateWorksheetOutputSchema,
  },
  generateWorksheet
);

const generateGoldWorksheetFlow = ai.defineFlow(
  {
    name: 'generateGoldWorksheetFlow',
    inputSchema: GenerateWorksheetInputSchema,
    outputSchema: GoldGenerateWorksheetOutputSchema,
  },
  generateGoldWorksheet
);
