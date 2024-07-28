import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { runCode } from "../services/compilerService";
import { getProblemById } from "../services/problemService";
import {
  getUserCode,
  saveUserCode,
  getAllSubmissions,
} from "../services/codeService";
import { getUserProfile } from "../services/userService";

const codeTemplates = {
  cpp: `#include <iostream>

int main() {
    std::cout << "Hello World!";
    return 0;
}
`,
  py: `print('Hello, world!')`,
  c: `#include <stdio.h>
int main() {
   // printf() displays the string inside quotation
   printf("Hello, World!");
   return 0;
}`,
  java: `import java.util.Scanner;

class Test
{
    public static void main(String []args)
    {
        System.out.println("My First Java Program.");
    }
}`,
};

const CodeEditor = () => {
  const [code, setCode] = useState(codeTemplates.cpp);
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [testCases, setTestCases] = useState([]);
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [userId, setUserId] = useState(null);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [status, setStatus] = useState("unsolved");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await getUserProfile();
        setUserId(profile._id);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userId && id && language) {
      const fetchUserCode = async () => {
        try {
          const userCode = await getUserCode(id, userId, language);
          if (userCode && userCode.code) {
            setCode(userCode.code);
            setStatus(userCode.status);
          }
        } catch (error) {
          console.error("Failed to fetch user code:", error);
        }
      };

      fetchUserCode();
    }
  }, [userId, id, language]);

  useEffect(() => {
    setCode(codeTemplates[language]);
  }, [language]);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const data = await getProblemById(id);
        setProblem(data);
        setTestCases(data.test_cases || []);
      } catch (error) {
        console.error("Failed to fetch problem:", error);
      }
    };

    fetchProblem();
  }, [id]);

  if (!problem) {
    return <div>Loading...</div>;
  }

  const handleViewSubmissions = async () => {
    try {
      const data = await getAllSubmissions(id);
      setSubmissions(data);
      setShowSubmissions(true);
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    }
  };

  const handleRunCode = async () => {
    if (testCases.length > 0) {
      const results = [];
      let allPassed = true;
      for (let i = 0; i < testCases.length; i++) {
        const selectedTestCase = testCases[i];
        try {
          const result = await runCode(language, code, selectedTestCase.input);
          const isPassed =
            result.output.trim() === selectedTestCase.output.trim();
          if (!isPassed) {
            allPassed = false;
          }
          results.push({
            input: selectedTestCase.input,
            expected: selectedTestCase.output,
            output: result.output,
            passed: isPassed,
          });
        } catch (error) {
          results.push({
            input: selectedTestCase.input,
            expected: selectedTestCase.output,
            output:
              "Error executing code: " + (error.message || "Unknown error"),
            passed: false,
          });
          allPassed = false;
        }
      }
      setTestResults(results);
      setOutput(
        results
          .map(
            (res, idx) =>
              `Test Case ${idx + 1}:\n${
                res.passed ? "Passed" : "Failed"
              }\nExpected: ${res.expected}\nOutput: ${res.output}`
          )
          .join("\n\n")
      );

      let newStatus = "unsolved";
      if (allPassed) {
        newStatus = "solved";
      } else if (results.some((result) => result.passed)) {
        newStatus = "attempted";
      }
      setStatus(newStatus);

      if (userId && id && language) {
        try {
          await saveUserCode(id, userId, code, language, newStatus);
        } catch (error) {
          console.error("Failed to save user code:", error);
        }
      }
    } else {
      setOutput("No test cases available");
    }
  };

  const languageMode = () => {
    switch (language) {
      case "cpp":
      case "c":
        return cpp();
      case "py":
        return python();
      case "java":
        return java();
      default:
        return cpp();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <style>
        {`
          .modal {
            display: flex;
            justify-content: center;
            align-items: center;
            position: fixed;
            z-index: 1;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0, 0, 0, 0.5);
          }
          .modal-content {
            background-color: #fefefe;
            margin: auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
          }
          .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
          }
          .close:hover,
          .close:focus {
            color: black;
            text-decoration: none;
            cursor: pointer;
          }
        `}
      </style>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="mb-2"
      >
        <option value="cpp">C++</option>
        <option value="c">C</option>
        <option value="py">Python</option>
        <option value="java">Java</option>
      </select>
      <CodeMirror
        value={code}
        height="600px"
        extensions={[languageMode()]}
        onChange={(value) => setCode(value)}
        theme="dark"
        className="cm-theme-dark"
      />
      <button
        onClick={handleRunCode}
        className="p-2 bg-gray-800 text-white rounded"
      >
        Run Code
      </button>
      <button
        onClick={handleViewSubmissions}
        className="p-2 bg-blue-500 text-white rounded mt-2"
      >
        View All Submissions
      </button>
      <textarea
        value={output}
        readOnly
        placeholder="Output"
        className="my-2 p-2 border rounded mt-2"
      />
      {status && <div>Status: {status}</div>}
      {testResults.length > 0 && (
        <div className="mt-4">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-2 rounded mb-2 ${
                result.passed ? "bg-green-500" : "bg-red-500"
              }`}
            >
              <p>Test Case {index + 1}:</p>
              <p>Input: {result.input}</p>
              <p>Expected Output: {result.expected}</p>
              <p>Actual Output: {result.output}</p>
              <p>{result.passed ? "Passed" : "Failed"}</p>
            </div>
          ))}
        </div>
      )}
      {showSubmissions && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowSubmissions(false)}>
              &times;
            </span>
            <h2>All Submissions</h2>
            {submissions.map((submission, index) => (
              <div key={index} className="p-2 mb-2 border rounded">
                <p>User: {submission.userId.userName}</p>
                <p>Code: {submission.code}</p>
                <p>Language: {submission.language}</p>
                <p>Status: {submission.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
