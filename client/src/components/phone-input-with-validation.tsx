import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";

interface PhoneInputWithValidationProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function PhoneInputWithValidation({
  value,
  onChange,
  label = "Phone Number",
  placeholder = "07123 456789",
  required = false,
  className = ""
}: PhoneInputWithValidationProps) {
  const [validationMessage, setValidationMessage] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const validatePhoneNumber = (phone: string) => {
    if (!phone.trim()) {
      setValidationMessage("");
      setIsValid(null);
      return;
    }

    // Remove all spaces, hyphens, and parentheses for validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // UK phone number validation patterns
    const ukMobilePattern = /^(07\d{9}|447\d{9}|\+447\d{9})$/;
    const ukLandlinePattern = /^(01\d{8,9}|02\d{8,9}|03\d{8,9}|08\d{8,9}|09\d{8,9}|441\d{8,9}|442\d{8,9}|443\d{8,9}|448\d{8,9}|449\d{8,9}|\+441\d{8,9}|\+442\d{8,9}|\+443\d{8,9}|\+448\d{8,9}|\+449\d{8,9})$/;

    // Check for obvious invalid patterns first
    if (cleanPhone.length < 10) {
      setValidationMessage("Phone number too short. UK numbers need at least 10 digits.");
      setIsValid(false);
      return;
    }

    if (cleanPhone.length > 13) {
      setValidationMessage("Phone number too long. Please check the format.");
      setIsValid(false);
      return;
    }

    // Check for non-digit characters (except + at start)
    if (!/^\+?\d+$/.test(cleanPhone)) {
      setValidationMessage("Phone number should only contain digits and an optional + at the start.");
      setIsValid(false);
      return;
    }

    // Check specific UK patterns
    if (ukMobilePattern.test(cleanPhone)) {
      setValidationMessage("Valid UK mobile number");
      setIsValid(true);
      return;
    }

    if (ukLandlinePattern.test(cleanPhone)) {
      setValidationMessage("Valid UK landline number");
      setIsValid(true);
      return;
    }

    // Provide specific guidance based on what they've entered
    if (cleanPhone.startsWith('0')) {
      if (cleanPhone.startsWith('07')) {
        setValidationMessage("Mobile numbers should be 11 digits (07123456789)");
      } else if (cleanPhone.startsWith('01') || cleanPhone.startsWith('02')) {
        setValidationMessage("Landline numbers should be 10-11 digits");
      } else {
        setValidationMessage("UK numbers start with 01, 02, 03, 07, 08, or 09");
      }
      setIsValid(false);
      return;
    }

    if (cleanPhone.startsWith('+44')) {
      setValidationMessage("International format: +44 followed by area code without leading 0");
      setIsValid(false);
      return;
    }

    if (cleanPhone.startsWith('44')) {
      setValidationMessage("Add + before 44 for international format, or use 0 for UK format");
      setIsValid(false);
      return;
    }

    // Generic invalid message
    setValidationMessage("Please enter a valid UK phone number (e.g., 07123 456789 or +44 7123 456789)");
    setIsValid(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isTyping) {
        validatePhoneNumber(value);
        setIsTyping(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [value, isTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsTyping(true);
    
    // Clear validation immediately when user starts typing
    if (validationMessage && newValue !== value) {
      setValidationMessage("");
      setIsValid(null);
    }
  };

  const getInputClassName = () => {
    let baseClass = "pr-10 " + className;
    
    if (isValid === true) {
      baseClass += " border-green-500 focus:border-green-500";
    } else if (isValid === false) {
      baseClass += " border-red-500 focus:border-red-500";
    }
    
    return baseClass;
  };

  const getValidationColor = () => {
    if (isValid === true) return "text-green-600";
    if (isValid === false) return "text-red-600";
    return "text-gray-500";
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="phone-input" className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          id="phone-input"
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={getInputClassName()}
          autoComplete="tel"
        />
        
        {/* Validation icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isValid === true && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {isValid === false && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
      </div>
      {/* Validation message */}
      {validationMessage && (
        <p className={`text-sm ${getValidationColor()}`}>
          {validationMessage}
        </p>
      )}
      {/* Helper text when no validation message */}
      {!validationMessage && !value && (
        <p className="text-gray-500 text-[12px]">Enter a valid UK mobile number e.g +447XXXXXXXXX or 07XXXXXXXXX</p>
      )}
    </div>
  );
}