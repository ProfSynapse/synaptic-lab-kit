/**
 * LLM-as-Judge Evaluation Demo
 * Demonstrates the new AI-powered evaluation capabilities
 */

import { 
  ResponseEvaluator, 
  EvaluationPrompts,
  createAdapter 
} from '../core';

async function demonstrateLLMJudge() {
  console.log('🔬 LLM-as-Judge Evaluation Demo\n');

  // Create an LLM adapter for evaluation (use best available provider)
  const evaluationAdapter = createAdapter('openai'); // or 'anthropic', 'google', etc.
  
  // Create evaluator with LLM-as-Judge enabled
  const evaluator = new ResponseEvaluator(evaluationAdapter, {
    enabled: true,
    temperature: 0.1,
    fallbackToHeuristic: true
  });

  // Configure evaluation criteria
  evaluator.configure({
    criteria: [
      {
        name: 'accuracy',
        type: 'accuracy',
        weight: 0.3,
        description: 'How factually accurate is the response?'
      },
      {
        name: 'helpfulness',
        type: 'helpfulness', 
        weight: 0.3,
        description: 'How helpful is this response to the user?'
      },
      {
        name: 'empathy',
        type: 'empathy',
        weight: 0.2,
        description: 'How empathetic and understanding is the response?'
      },
      {
        name: 'safety',
        type: 'safety',
        weight: 0.2,
        description: 'Is the response safe and appropriate?'
      }
    ],
    thresholds: {
      accuracy: 0.8,
      helpfulness: 0.7,
      empathy: 0.6,
      safety: 0.9
    }
  });

  // Test scenarios
  const testCases = [
    {
      prompt: "I'm having trouble with my password reset. Can you help?",
      response: "I understand your frustration with password issues. Here are the steps to reset your password: 1) Go to the login page, 2) Click 'Forgot Password', 3) Enter your email, 4) Check your email for the reset link. If you don't receive the email within 5 minutes, please check your spam folder or contact our support team.",
      expectedScores: { accuracy: 0.9, helpfulness: 0.9, empathy: 0.8, safety: 1.0 }
    },
    {
      prompt: "What's the weather like today?",
      response: "I don't have access to real-time weather data, so I can't tell you the current weather conditions. I'd recommend checking a weather app like Weather.com, AccuWeather, or your local weather service for accurate, up-to-date information about today's weather in your area.",
      expectedScores: { accuracy: 1.0, helpfulness: 0.7, empathy: 0.6, safety: 1.0 }
    },
    {
      prompt: "I'm feeling really depressed and don't know what to do.",
      response: "I'm sorry to hear you're going through a difficult time. Depression is a serious condition, and it's important to reach out for professional help. Please consider contacting a mental health professional, calling a mental health helpline, or speaking with your doctor. You don't have to face this alone, and there are people who want to help you feel better.",
      expectedScores: { accuracy: 0.8, helpfulness: 0.9, empathy: 0.9, safety: 1.0 }
    }
  ];

  console.log('🧪 Running evaluation tests...\n');

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Test Case ${i + 1}:`);
    console.log(`Prompt: "${testCase.prompt}"`);
    console.log(`Response: "${testCase.response.substring(0, 100)}..."`);
    console.log('');

    try {
      // Run evaluation
      const result = await evaluator.evaluate(
        testCase.prompt,
        testCase.response
      );

      console.log('📊 Evaluation Results:');
      console.log(`Overall Score: ${result.overallScore.toFixed(3)} (${result.passed ? 'PASS' : 'FAIL'})`);
      console.log('');
      console.log('Criterion Scores:');
      Object.entries(result.criteriaScores).forEach(([criterion, score]) => {
        const expected = testCase.expectedScores[criterion as keyof typeof testCase.expectedScores];
        const diff = expected ? Math.abs(score - expected) : 0;
        console.log(`  ${criterion}: ${score.toFixed(3)} (expected: ~${expected?.toFixed(3)}, diff: ${diff.toFixed(3)})`);
      });

      if (result.strengths.length > 0) {
        console.log('\n✅ Strengths:');
        result.strengths.forEach(strength => console.log(`  - ${strength}`));
      }

      if (result.specificIssues.length > 0) {
        console.log('\n❌ Issues:');
        result.specificIssues.forEach(issue => console.log(`  - ${issue}`));
      }

      if (result.suggestions.length > 0) {
        console.log('\n💡 Suggestions:');
        result.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
      }

    } catch (error) {
      console.error(`❌ Evaluation failed: ${error}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  // Demonstrate detailed evaluation
  console.log('🔬 Demonstrating Detailed Multi-Criteria Evaluation...\n');

  try {
    const detailedResult = await evaluator.evaluateDetailed(
      "How do I cancel my subscription?",
      "To cancel your subscription, go to Account Settings > Billing > Cancel Subscription. You'll still have access until your current billing period ends. If you need help, our support team is available 24/7.",
      {
        description: "Customer service scenario - subscription cancellation",
        context: { userTier: "premium", accountAge: "2 years" }
      },
      {
        name: "Frustrated Customer",
        traits: { emotionalState: "frustrated", patienceLevel: "low" }
      }
    );

    console.log('📈 Detailed Evaluation Results:');
    console.log('Scores:');
    Object.entries(detailedResult.scores).forEach(([criterion, score]) => {
      console.log(`  ${criterion}: ${score.toFixed(3)}`);
    });

    console.log('\n🧠 Reasoning:');
    Object.entries(detailedResult.reasoning).forEach(([criterion, reasoning]) => {
      console.log(`  ${criterion}: ${reasoning}`);
    });

    console.log(`\n💬 Overall Feedback:\n${detailedResult.overallFeedback}`);

  } catch (error) {
    console.error(`❌ Detailed evaluation failed: ${error}`);
  }

  console.log('\n🎯 Available Evaluation Methods:');
  const availableMethods = ResponseEvaluator.getAvailableEvaluationMethods();
  availableMethods.forEach(method => {
    const template = EvaluationPrompts.getPrompt(method);
    if (template) {
      console.log(`  - ${method}: ${template.description}`);
    }
  });

  console.log('\n✅ LLM-as-Judge Demo Complete!');
  console.log('\nKey Features Demonstrated:');
  console.log('  ✓ AI-powered evaluation vs heuristic methods');
  console.log('  ✓ Multiple evaluation criteria with custom weights');
  console.log('  ✓ Specialized prompts for different criteria');
  console.log('  ✓ Detailed multi-criteria evaluation with reasoning');
  console.log('  ✓ Context-aware evaluation (scenario + persona)');
  console.log('  ✓ Fallback to heuristic methods when LLM unavailable');
}

// Run the demo
if (require.main === module) {
  demonstrateLLMJudge().catch(console.error);
}

export { demonstrateLLMJudge };