import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { environment } from "../../../environments";
import AuthLayout from "./AuthLayout";
import stemette from "../../../assets/images/StreakProgressAssets/stemette.svg";

const inputClass = (invalid: boolean) =>
  `w-full rounded-lg border-2 px-4 py-3.5 text-base text-dark bg-white caret-dark
   focus:outline-none focus:shadow-none transition-colors ${
     invalid ? "border-red" : "border-borderLight focus:border-primary"
   }`;

const AddChild = () => {
  const [cookies] = useCookies(["login"]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    retypedPassword: "",
    birthday: "",
    gender: "",
    gradeLevel: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChildren, setHasChildren] = useState(false);

  useEffect(() => {
    const checkChildren = async () => {
      try {
        const response = await fetch(`${environment.urls.middlewareURL}/user/children`, {
          headers: { Authorization: `Bearer ${cookies.login}` },
        });
        if (response.ok) {
          const data = await response.json();
          setHasChildren(Array.isArray(data) && data.length > 0);
        }
      } catch (error) {
        setHasChildren(false);
      }
    };
    checkChildren();
  }, [cookies.login]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!/^[A-Za-z ]{2,15}$/.test(formData.firstName)) {
      next.firstName = "Invalid First Name";
    }
    if (!/^[A-Za-z]{2,15}$/.test(formData.lastName)) {
      next.lastName = "Invalid Last Name";
    }
    if (!/^[a-zA-Z](\S){1,14}$/.test(formData.username)) {
      next.username = "Invalid Username";
    }
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}/.test(formData.email)) {
      next.email = "Invalid Email";
    }
    if (formData.password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    if (formData.retypedPassword !== formData.password) {
      next.retypedPassword = "Passwords do not match";
    }
    if (formData.birthday === "") {
      next.birthday = "Birthday is required";
    }
    if (formData.gradeLevel.trim() === "") {
      next.gradeLevel = "Grade level is required";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    const params = new URLSearchParams({
      first: formData.firstName,
      last: formData.lastName,
      username: formData.username,
      email: formData.email,
      password: formData.password,
      birthday: formData.birthday,
      gender: formData.gender,
      gradeLevel: formData.gradeLevel,
    });

    try {
      const response = await fetch(
        `${environment.urls.middlewareURL}/user/children?${params.toString()}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${cookies.login}` },
        }
      );

      if (!response.ok) {
        const content = await response.text();
        if (content.includes("username has been taken")) {
          setErrors((prev) => ({ ...prev, username: "Username already taken" }));
        } else {
          setErrors((prev) => ({ ...prev, general: "Could not add child. Please try again." }));
        }
        return;
      }

      navigate("/signup/parent/section");
    } catch (error) {
      setErrors((prev) => ({ ...prev, general: "Could not add child. Please try again." }));
    }
  };

  const handleCancel = () => {
    navigate("/signup/parent/section");
  };

  return (
    <div className="relative">
      <img
        src={stemette}
        alt=""
        aria-hidden="true"
        className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-80 xl:w-96 h-auto pointer-events-none"
      />
      <AuthLayout
      step={hasChildren ? undefined : 1}
      tightSides
      panelTitle="Set up your child's account"
    >
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">Add a Child</h1>

      {errors.general && (
        <p className="text-red font-semibold mb-4 text-center" role="alert">
          {errors.general}
        </p>
      )}

      <form
        className="w-full max-w-md bg-light rounded-2xl border-2 border-dark shadow-md p-8 flex flex-col gap-4"
        aria-label="Add a Child Form"
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
            placeholder="Re-enter password"
            value={formData.retypedPassword}
            onChange={handleInputChange}
            required
            className={inputClass(!!errors.retypedPassword)}
          />
          {errors.retypedPassword && <span className="text-red text-xs">{errors.retypedPassword}</span>}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="birthday" className="text-base font-bold text-dark">Birthday</label>
            <input
              type="date"
              name="birthday"
              id="birthday"
              value={formData.birthday}
              onChange={handleInputChange}
              required
              className={inputClass(!!errors.birthday)}
            />
            {errors.birthday && <span className="text-red text-xs">{errors.birthday}</span>}
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
          <label htmlFor="gradeLevel" className="text-base font-bold text-dark">Grade Level</label>
          <input
            type="text"
            name="gradeLevel"
            id="gradeLevel"
            placeholder="Grade Level"
            value={formData.gradeLevel}
            onChange={handleInputChange}
            required
            className={inputClass(!!errors.gradeLevel)}
          />
          {errors.gradeLevel && <span className="text-red text-xs">{errors.gradeLevel}</span>}
        </div>

        <div className="flex justify-center gap-4 pt-2">
          <button type="submit" className="btn-yellow px-10">Add</button>
          <button type="button" onClick={handleCancel} className="btn-cancel px-10">Cancel</button>
        </div>
      </form>
      </AuthLayout>
    </div>
  );
};

export default AddChild;
