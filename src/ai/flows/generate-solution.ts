'use server';

/**
 * @fileOverview Generates step-by-step solutions for math problems.
 *
 * - generateSolution - A function that generates solutions for a given math problem.
 * - GenerateSolutionInput - The input type for the generateSolution function.
 * - GenerateSolutionOutput - The return type for the generateSolution function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSolutionInputSchema = z.object({
  problem: z.string().describe('The math problem to solve.'),
  gradeLevel: z.string().describe('The grade level of the student.'),
  topic: z.string().describe('The math topic of the problem.'),
  difficultyLevel: z.string().describe('The difficulty level of the problem.'),
});
export type GenerateSolutionInput = z.infer<typeof GenerateSolutionInputSchema>;

const GenerateSolutionOutputSchema = z.object({
  solution: z.string().describe('The step-by-step solution to the problem, with all calculations double-checked for accuracy.'),
});
export type GenerateSolutionOutput = z.infer<typeof GenerateSolutionOutputSchema>;

export async function generateSolution(input: GenerateSolutionInput): Promise<GenerateSolutionOutput> {
  return generateSolutionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSolutionPrompt',
  input: {schema: GenerateSolutionInputSchema},
  output: {schema: GenerateSolutionOutputSchema},
  prompt: `You are an expert math tutor and mathematician. Your primary goal is to provide solutions that are 100% accurate. Double-check every calculation and step. You are patient and explain things clearly.

  A student in grade {{gradeLevel}} is working on a problem in the topic of {{topic}} with difficulty level {{difficultyLevel}}.

  Provide a step-by-step solution to the following problem. Ensure your final answer is correct and that all intermediate steps are mathematically sound. Your response must be flawless.
  Problem: {{problem}}`,
});

const generateSolutionFlow = ai.defineFlow(
  {
    name: 'generateSolutionFlow',
    inputSchema: GenerateSolutionInputSchema,
    outputSchema: GenerateSolutionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
