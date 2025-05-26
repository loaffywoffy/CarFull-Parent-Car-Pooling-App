
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SimpleCaptchaProps {
  onSolved: (token: string) => void;
  onReset: () => void;
  reset?: boolean;
}

export function SimpleCaptcha({ onSolved, onReset, reset }: SimpleCaptchaProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setNum1(n1);
    setNum2(n2);
    setUserAnswer("");
    setIsCorrect(false);
    onReset();
  };

  useEffect(() => {
    generateCaptcha();
  }, [reset]);

  useEffect(() => {
    const answer = parseInt(userAnswer);
    if (!isNaN(answer) && answer === num1 + num2) {
      setIsCorrect(true);
      // Generate a simple token (in production, use a proper token)
      const token = btoa(`${num1}+${num2}=${answer}:${Date.now()}`);
      onSolved(token);
    } else {
      setIsCorrect(false);
      onReset();
    }
  }, [userAnswer, num1, num2]);

  return (
    <div className="space-y-2">
      <Label htmlFor="captcha">Security Check: What is {num1} + {num2}?</Label>
      <div className="flex gap-2">
        <Input
          id="captcha"
          type="number"
          placeholder="Enter answer"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          className={isCorrect ? "border-green-500" : ""}
        />
        <div className="flex items-center px-2">
          {isCorrect ? "✓" : ""}
        </div>
      </div>
    </div>
  );
}
