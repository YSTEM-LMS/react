import { useState } from "react";
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

const ParentSignUp = () => {
  const [, setCookie] = useCookies(["login"]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    occupation: "",
    password: "",
    retypedPassword: "",
    zipcode: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsFlag, setTermsFlag] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!/^[a-zA-Z](\S){1,14}$/.test(formData.username)) {
      next.username = "Invalid Username";
    }
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}/.test(formData.email)) {
      next.email = "Invalid Email";
    }
    if (!/^[A-Za-z ]{2,15}$/.test(formData.firstName)) {
      next.firstName = "Invalid First Name";
    }
    if (!/^[A-Za-z]{2,15}$/.test(formData.lastName)) {
      next.lastName = "Invalid Last Name";
    }
    if (formData.occupation.trim() === "") {
      next.occupation = "Occupation is required";
    }
    if (formData.password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    if (formData.retypedPassword !== formData.password) {
      next.retypedPassword = "Passwords do not match";
    }
    if (formData.zipcode !== "" && !/^\d{5}$/.test(formData.zipcode)) {
      next.zipcode = "Invalid Zip Code";
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
      role: "parent",
      zipcode: formData.zipcode,
      occupation: formData.occupation,
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

      navigate("/signup/parent/section");
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
        className="hidden lg:block absolute top-0 left-0 w-56 xl:w-64 h-auto pointer-events-none -scale-x-100"
      />
      <AuthLayout
      step={0}
      panelTitle="Helping your child develop critical thinking skills"
    >
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">Parent Sign Up</h1>

      {errors.general && (
        <p className="text-red font-semibold mb-4 text-center" role="alert">
          {errors.general}
        </p>
      )}

      <form
        className="w-full max-w-md bg-light rounded-2xl border-2 border-dark shadow-md p-8 flex flex-col gap-4"
        aria-label="Parent Sign Up Form"
        onSubmit={handleSubmit}
      >
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
          <label htmlFor="occupation" className="text-base font-bold text-dark">Occupation</label>
          <input
            type="text"
            name="occupation"
            id="occupation"
            placeholder="Occupation"
            value={formData.occupation}
            onChange={handleInputChange}
            required
            className={inputClass(!!errors.occupation)}
          />
          {errors.occupation && <span className="text-red text-xs">{errors.occupation}</span>}
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="zipcode" className="text-base font-bold text-dark">Zip Code</label>
          <input
            type="text"
            name="zipcode"
            id="zipcode"
            placeholder="Zip Code"
            value={formData.zipcode}
            onChange={handleInputChange}
            className={inputClass(!!errors.zipcode)}
          />
          {errors.zipcode && <span className="text-red text-xs">{errors.zipcode}</span>}
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

export default ParentSignUp;
