import { GoogleGenAI } from "@google/genai";
import { config } from "../config";

const ai = new GoogleGenAI({ 
  apiKey: config.gemini.apiKey
});

export interface FileTagging {
  tags: string[];
  suggestedFolderName?: string;
  suggestedFileName?: string;
  confidence: number;
}

export async function generateFileTags(
  fileName: string, 
  fileType: string, 
  fileContent?: string
): Promise<FileTagging> {
  try {
    const systemPrompt = `You are an AI file organization expert. 
Analyze the file information and generate relevant tags, folder suggestions, and filename improvements.
Consider the file name, type, and content if provided.
Respond with JSON in the exact format specified.`;

    const userPrompt = `
File: ${fileName}
Type: ${fileType}
${fileContent ? `Content preview: ${fileContent.substring(0, 1000)}` : ''}

Generate appropriate tags and organization suggestions for this file.
Tags should be relevant categories like: document, report, image, project, finance, personal, work, etc.
Suggest a folder name if this file should be organized into a category.
Suggest an improved filename if the current one could be more descriptive.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" }
            },
            suggestedFolderName: { type: "string" },
            suggestedFileName: { type: "string" },
            confidence: { type: "number" }
          },
          required: ["tags", "confidence"]
        }
      },
      contents: userPrompt
    });

    const rawJson = response.text;
    
    if (rawJson && rawJson.trim()) {
      try {
        const data: FileTagging = JSON.parse(rawJson);
        return data;
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        throw new Error("Failed to parse Gemini response");
      }
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error("Gemini AI tagging failed:", error);
    // Fallback to simple rule-based tagging
    return generateFallbackTags(fileName, fileType);
  }
}

function generateFallbackTags(fileName: string, fileType: string): FileTagging {
  const tags: string[] = [];
  const lowerName = fileName.toLowerCase();
  const lowerType = fileType.toLowerCase();

  let suggestedFolderName: string | undefined;

  // File type based tags and folder suggestions
  if (lowerType.includes('pdf') || lowerType.includes('doc')) {
    tags.push('document');
    
    // Specific document categories
    if (lowerName.includes('resume') || lowerName.includes('cv')) {
      tags.push('resume', 'personal');
      suggestedFolderName = 'Resumes';
    } else if (lowerName.includes('assignment') || lowerName.includes('homework')) {
      tags.push('assignment', 'work');
      suggestedFolderName = 'Assignments';
    } else if (lowerName.includes('cover') && lowerName.includes('letter')) {
      tags.push('work', 'application');
      suggestedFolderName = 'Cover Letters';
    } else if (lowerName.includes('job') || lowerName.includes('application')) {
      tags.push('work', 'application');
      suggestedFolderName = 'Job Applications';
    } else {
      suggestedFolderName = 'Documents';
    }
  }
  
  if (lowerType.includes('image') || lowerType.includes('jpg') || lowerType.includes('png')) {
    tags.push('image');
    
    if (lowerName.includes('photo') || lowerName.includes('pic')) {
      tags.push('photo');
      suggestedFolderName = 'Photos';
    } else if (lowerName.includes('screenshot')) {
      tags.push('screenshot');
      suggestedFolderName = 'Screenshots';
    } else if (lowerName.includes('wallpaper') || lowerName.includes('background')) {
      tags.push('wallpaper');
      suggestedFolderName = 'Wallpapers';
    } else {
      suggestedFolderName = 'Images';
    }
  }
  
  if (lowerType.includes('excel') || lowerType.includes('csv') || lowerType.includes('spreadsheet')) {
    tags.push('spreadsheet', 'data');
    
    if (lowerName.includes('customer') || lowerName.includes('client')) {
      tags.push('customer');
      suggestedFolderName = 'Customer Data';
    } else if (lowerName.includes('finance') || lowerName.includes('loan') || lowerName.includes('payment')) {
      tags.push('finance');
      suggestedFolderName = 'Financial Data';
    } else {
      suggestedFolderName = 'Spreadsheets';
    }
  }
  
  if (lowerType.includes('video') || lowerType.includes('mp4')) {
    tags.push('video');
    suggestedFolderName = 'Videos';
  }

  // Content based tags from filename
  if (lowerName.includes('report')) tags.push('report');
  if (lowerName.includes('invoice') || lowerName.includes('receipt')) {
    tags.push('finance');
    suggestedFolderName = 'Financial Documents';
  }
  if (lowerName.includes('project')) {
    tags.push('project');
    suggestedFolderName = 'Projects';
  }
  if (lowerName.includes('presentation') || lowerName.includes('ppt')) {
    tags.push('presentation');
    suggestedFolderName = 'Presentations';
  }

  return {
    tags: tags.length > 0 ? tags : ['uncategorized'],
    suggestedFolderName,
    confidence: 0.7
  };
}

export async function generateBulkTags(files: Array<{ name: string; type: string }>): Promise<FileTagging[]> {
  const results = await Promise.allSettled(
    files.map(file => generateFileTags(file.name, file.type))
  );

  return results.map(result => 
    result.status === 'fulfilled' 
      ? result.value 
      : { tags: ['uncategorized'], confidence: 0.3 }
  );
}
