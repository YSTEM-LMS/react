import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { environment } from "../../../environments";
import AuthLayout from "./AuthLayout";
import stemmyVine from "../../../assets/images/ActivitiesAssets/stemmy.svg";

const inputClass = (invalid: boolean) =>
  `w-full rounded-lg border-2 px-4 py-3.5 text-base text-dark bg-white caret-dark
   focus:outline-none focus:shadow-none transition-colors ${
     invalid ? "border-red" : "border-borderLight focus:border-primary"
   }`;

const MentorSignUp = () => {
  const [, setCookie] = useCookies(["login"]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    retypedPassword: "",
    zipcode: "",
    gender: "",
    education: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsFlag, setTermsFlag] = useState(false);

  // Optional mentor -> student matching. Backed by the existing endpoints
  // GET /user/mentorless (search unmatched students) and, after login,
  // PUT /user/updateMentorship (links both users' mentorshipUsername).
  const [studentKeyword, setStudentKeyword] = useState("");
  const [studentResults, setStudentResults] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [searchingStudents, setSearchingStudents] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Debounced search of unmatched students as the mentor types.
  useEffect(() => {
    if (selectedStudent) return;
    const keyword = studentKeyword.trim();
    if (keyword === "") {
      setStudentResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSearchingStudents(true);
        const res = await fetch(
          `${environment.urls.middlewareURL}/user/mentorless?keyword=${encodeURIComponent(keyword)}`
        );
        if (res.ok && !cancelled) {
          const list = await res.json();
          setStudentResults(Array.isArray(list) ? list.slice(0, 8) : []);
        }
      } catch {
        if (!cancelled) setStudentResults([]);
      } finally {
        if (!cancelled) setSearchingStudents(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [studentKeyword, selectedStudent]);

  const validate = () => {
    const next: Record<string, string> = {};

    if (!/^[A-Za-z ]{2,15}$/.test(formData.firstName)) {
      next.firstName = "Invalid First Name";
    }
    if (!/^[A-Za-z]{2,15}$/.test(formData.lastName)) {
      next.lastName = "Invalid Last Name";
    }
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}/.test(formData.email)) {
      next.email = "Invalid Email";
    }
    if (!/^[a-zA-Z](\S){1,14}$/.test(formData.username)) {
      next.username = "Invalid Username";
    }
    if (formData.password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    if (formData.retypedPassword !== formData.password) {
      next.retypedPassword = "Passwords do not match";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsFlag) {
      setErrors((prev) => ({ ...prev, general: "Please accept the terms and conditions." }));
      return;
    }
    if (!validate()) {
      return;
    }

    const signupParams = new URLSearchParams({
      first: formData.firstName,
      last: formData.lastName,
      email: formData.email,
      password: formData.password,
      username: formData.username,
      role: "mentor",
      zipcode: formData.zipcode,
      gender: formData.gender,
      gradeLevel: formData.education,
    });

    try {
      const signupResponse = await fetch(
        `${environment.urls.middlewareURL}/user/?${signupParams.toString()}`,
        { method: "POST" }
      );

      if (!signupResponse.ok) {
        const content = await signupResponse.text();
        if (content.includes("username has been taken")) {
          setErrors((prev) => ({ ...prev, username: "Username already taken" }));
        } else {
          setErrors((prev) => ({ ...prev, general: "Sign up failed. Please try again." }));
        }
        return;
      }

      const loginResponse = await fetch(
        `${environment.urls.middlewareURL}/auth/login?username=${encodeURIComponent(
          formData.username
        )}&password=${encodeURIComponent(formData.password)}`,
        { method: "POST" }
      );

      if (!loginResponse.ok) {
        setErrors((prev) => ({ ...prev, general: "Account created. Please log in to continue." }));
        navigate("/login");
        return;
      }

      const loginData = await loginResponse.json();
      const expires = new Date();
      expires.setDate(expires.getDate() + 1);
      setCookie("login", loginData.token, { expires, path: "/" });

      // If the mentor picked a student, link them now that we're authenticated.
      // Best-effort: the account already exists, so a failed match shouldn't
      // block sign-up (e.g. the student may have just been matched elsewhere).
      if (selectedStudent) {
        try {
          const matchRes = await fetch(
            `${environment.urls.middlewareURL}/user/updateMentorship?mentorship=${encodeURIComponent(
              selectedStudent
            )}`,
            {
              method: "PUT",
              headers: { Authorization: `Bearer ${loginData.token}` },
            }
          );
          if (!matchRes.ok) {
            console.warn("Student match failed:", await matchRes.text());
          }
        } catch (matchErr) {
          console.warn("Student match request failed:", matchErr);
        }
      }

      navigate("/");
    } catch (error) {
      setErrors((prev) => ({ ...prev, general: "Sign up failed. Please try again." }));
    }
  };

  return (
    <div className="relative">
      <img
        src={stemmyVine}
        alt=""
        aria-hidden="true"
        className="hidden lg:block absolute top-16 left-0 w-72 xl:w-80 h-auto pointer-events-none -scale-x-100"
      />
      <AuthLayout
      panelTitle="Share your knowledge, change a life"
      links={[
        { label: "About Us", to: "/about-us" },
        { label: "Our Mission", to: "/mission" },
      ]}
    >
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">Mentor Sign Up</h1>

      {errors.general && (
        <p className="text-red font-semibold mb-4 text-center" role="alert">
          {errors.general}
        </p>
      )}

      <form
        className="w-full max-w-md bg-light rounded-2xl border-2 border-dark shadow-md p-8 flex flex-col gap-4"
        aria-label="Mentor Sign Up Form"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="firstName" className="text-base font-bold text-dark">First Name</label>
            <input
              type="text"
              name="firstName"
              id="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              className={inputClass(!!errors.firstName)}
            />
            {errors.firstName && <span className="text-red text-xs">{errors.firstName}</span>}
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="lastName" className="text-base font-bold text-dark">Last Name</label>
            <input
              type="text"
              name="lastName"
              id="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              className={inputClass(!!errors.lastName)}
            />
            {errors.lastName && <span className="text-red text-xs">{errors.lastName}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-base font-bold text-dark">Email</label>
          <input
            type="email"
            name="email"
            id="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleInputChange}
            required
            className={inputClass(!!errors.email)}
          />
          {errors.email && <span className="text-red text-xs">{errors.email}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="username" className="text-base font-bold text-dark">Username</label>
          <input
            type="text"
            name="username"
            id="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleInputChange}
            required
            className={inputClass(!!errors.username)}
          />
          {errors.username && <span className="text-red text-xs">{errors.username}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-base font-bold text-dark">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className={inputClass(!!errors.password)}
          />
          {errors.password && <span className="text-red text-xs">{errors.password}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="retypedPassword" className="text-base font-bold text-dark">Re-enter Password</label>
          <input
            type="password"
            name="retypedPassword"
            id="retypedPassword"
            placeholder="Re-enter your password"
            value={formData.retypedPassword}
            onChange={handleInputChange}
            required
            className={inputClass(!!errors.retypedPassword)}
          />
          {errors.retypedPassword && <span className="text-red text-xs">{errors.retypedPassword}</span>}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="zipcode" className="text-base font-bold text-dark">Zip Code</label>
            <input
              type="text"
              name="zipcode"
              id="zipcode"
              placeholder="Zip Code"
              value={formData.zipcode}
              onChange={handleInputChange}
              className={inputClass(false)}
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="gender" className="text-base font-bold text-dark">Gender</label>
            <select
              name="gender"
              id="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className={inputClass(false)}
            >
              <option value="">Prefer not to say</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="education" className="text-base font-bold text-dark">Current Occupation / Education</label>
          <input
            type="text"
            name="education"
            id="education"
            placeholder="Current Occupation / Education"
            value={formData.education}
            onChange={handleInputChange}
            className={inputClass(false)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="mentee-search-input" className="text-base font-bold text-dark">
            Find a Student <span className="font-normal text-muted">(optional)</span>
          </label>

          {selectedStudent ? (
            <div
              className="flex items-center justify-between rounded-lg border-2 border-primary bg-soft px-4 py-3"
              data-testid="selected-student"
            >
              <span className="text-base text-dark">
                Matched with <b>{selectedStudent}</b>
              </span>
              <button
                type="button"
                className="text-sm font-bold text-primary hover:text-dark"
                onClick={() => {
                  setSelectedStudent("");
                  setStudentKeyword("");
                  setStudentResults([]);
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                id="mentee-search-input"
                placeholder="Search students by username"
                value={studentKeyword}
                onChange={(e) => setStudentKeyword(e.target.value)}
                onKeyDown={(e) => {
                  // Don't submit the whole form when searching.
                  if (e.key === "Enter") e.preventDefault();
                }}
                autoComplete="off"
                className={inputClass(false)}
              />

              {studentKeyword.trim() !== "" && (
                <div
                  className="rounded-lg border-2 border-borderLight bg-white divide-y divide-borderLight max-h-48 overflow-y-auto"
                  data-testid="student-results"
                >
                  {searchingStudents ? (
                    <p className="px-4 py-2 text-sm text-muted">Searching…</p>
                  ) : studentResults.length === 0 ? (
                    <p className="px-4 py-2 text-sm text-muted">
                      No unmatched students found.
                    </p>
                  ) : (
                    studentResults.map((name) => (
                      <button
                        type="button"
                        key={name}
                        className="block w-full text-left px-4 py-2 text-base text-dark hover:bg-soft"
                        onClick={() => {
                          setSelectedStudent(name);
                          setStudentResults([]);
                        }}
                      >
                        {name}
                      </button>
                    ))
                  )}
                </div>
              )}

              <span className="text-xs text-muted">
                Pick a student to mentor, or skip and match later.
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            id="terms"
            checked={termsFlag}
            onChange={(e) => setTermsFlag(e.target.checked)}
            required
          />
          <label htmlFor="terms" className="text-dark">I accept the terms and conditions</label>
        </div>

        <div className="flex justify-center pt-2">
          <button type="submit" className="btn-yellow px-10">Sign Up</button>
        </div>
      </form>
      </AuthLayout>
    </div>
  );
};

export default MentorSignUp;
