
'use server';

import { generateWorksheet, generateGoldWorksheet, type GenerateWorksheetInput, type GenerateWorksheetOutput, type GoldGenerateWorksheetOutput } from "@/ai/flows/generate-worksheet";
import { getDatabase, ref, push, serverTimestamp, get, update } from "firebase/database";
import { app } from "@/lib/firebase";

// Initialize Firebase database
const db = getDatabase(app);

interface ActionResult {
    success: boolean;
    data?: GenerateWorksheetOutput | GoldGenerateWorksheetOutput;
    error?: string;
}

// Function to get user's subscription tier
async function getUserSubscriptionTier(userId: string): Promise<string> {
    try {
        const userRef = ref(db, `users/${userId}/subscription`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const subscriptionData = snapshot.val();
            return subscriptionData.tier || 'FREE';
        }
        
        return 'FREE'; // Default to free tier
    } catch (error) {
        console.error('Error fetching user subscription:', error);
        return 'FREE'; // Default to free tier on error
    }
}

// Function to check if user can generate a new worksheet
async function canGenerateWorksheet(userId: string): Promise<{ canGenerate: boolean; message?: string }> {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    const userData = snapshot.val();
    
    if (!userData || !userData.lastWorksheetGeneration) {
        return { canGenerate: true };
    }
    
    const lastGenDate = new Date(userData.lastWorksheetGeneration);
    const now = new Date();
    
    // Check if the last generation was today
    if (lastGenDate.toDateString() === now.toDateString()) {
        return { 
            canGenerate: false, 
            message: 'You can only generate one worksheet per day. Please come back tomorrow.'
        };
    }
    
    return { canGenerate: true };
}

// Function to update the last worksheet generation time
async function updateLastWorksheetGeneration(userId: string): Promise<void> {
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, {
        lastWorksheetGeneration: serverTimestamp()
    });
}

export async function generateWorksheetAction(userId: string, input: GenerateWorksheetInput, isExamPaper: boolean = false): Promise<ActionResult> {
    try {
        // Check daily limit
        const { canGenerate, message } = await canGenerateWorksheet(userId);
        if (!canGenerate) {
            return {
                success: false,
                error: message || 'Daily worksheet generation limit reached'
            };
        }

        // Get user's subscription tier
        const userTier = await getUserSubscriptionTier(userId);
        
        // Check if user is trying to generate exam paper without Gold subscription
        if (isExamPaper && userTier !== 'GOLD') {
            return { success: false, error: "Exam paper generation is only available for Gold subscribers." };
        }
        
        // Generate worksheet based on subscription tier
        const result = (userTier === 'GOLD' && isExamPaper) ? 
            await generateGoldWorksheet(input) : 
            await generateWorksheet(input);
            
        if (!result || !result.questions || result.questions.length === 0) {
             return { success: false, error: "Failed to generate worksheet. The AI returned an empty response." };
        }
        
        // Save to history
        const historyRef = ref(db, `worksheets/${userId}`);
        await push(historyRef, {
            input,
            output: result,
            type: isExamPaper ? 'exam_paper' : 'worksheet',
            tier: userTier,
            createdAt: serverTimestamp(),
        });
        
        return { success: true, data: result };
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        return { success: false, error: `An unexpected error occurred: ${errorMessage}` };
    }
}

// Gold-specific action for exam paper generation
export async function generateExamPaperAction(userId: string, input: GenerateWorksheetInput): Promise<ActionResult> {
    return generateWorksheetAction(userId, input, true);
}
