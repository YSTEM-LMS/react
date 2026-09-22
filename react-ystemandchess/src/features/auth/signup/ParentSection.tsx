import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { environment } from "../../../environments";
import treesGroup from "../../../assets/images/Trees-Group.png";
import stemmyVine from "../../../assets/images/ActivitiesAssets/stemmy.svg";
import OnboardingSteps from "./OnboardingSteps";

type Child = {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
};

const ParentSection = () => {
  const [cookies] = useCookies(["login"]);
  const navigate = useNavigate();

  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await fetch(`${environment.urls.middlewareURL}/user/children`, {
          method: "GET",
          headers: { Authorization: `Bearer ${cookies.login}` },
        });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        setChildren(data);
      } catch (error) {
        setChildren([]);
      }
    };
    fetchChildren();
  }, [cookies.login]);

  const goToStudent = () => {
    const child = children.find((c) => c._id === selected);
    if (child) {
      const name = child.firstName || child.username;
      navigate(
        `/student-profile?student=${encodeURIComponent(child.username)}&name=${encodeURIComponent(name)}`
      );
    }
  };

  return (
    <div className="relative min-h-[71vh] px-4 py-12 flex flex-col items-center">
      <img
        src={stemmyVine}
        alt=""
        aria-hidden="true"
        className="hidden lg:block absolute top-12 right-0 w-56 xl:w-64 h-auto pointer-events-none"
      />
      <div className="w-full max-w-6xl">
        {children.length === 0 && <OnboardingSteps current={1} />}

        <div className="relative flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
          <img
            src={treesGroup}
            alt="Group of Y STEM mascots playing chess"
            className="hidden lg:block absolute top-1/2 -translate-y-1/2 -left-[24rem] w-[36rem] xl:w-[40rem] h-auto pointer-events-none"
          />

          <div className="relative flex flex-col items-center w-full">
            <div className="w-full max-w-lg">
              <h1 className="text-6xl font-bold text-dark mb-40">Parent Profile</h1>
            </div>

            <div className="relative w-full flex flex-col items-center">
              <div className="bg-light rounded-3xl border-2 border-dark shadow-md p-8 flex flex-col gap-5 w-full max-w-lg">
                {children.length === 0 && (
                  <p className="text-base text-gray">No children added yet. Add your first child to get started.</p>
                )}

                {children.map((child) => (
                  <button
                    key={child._id}
                    type="button"
                    onClick={() => setSelected(child._id)}
                    className={`group flex items-center gap-4 w-full rounded-xl border-2 px-6 py-5 text-left transition-all ${
                      selected === child._id
                        ? "border-primary bg-soft ring-2 ring-primary/30"
                        : "border-borderLight bg-white hover:border-primary hover:scale-[1.02]"
                    }`}
                  >
                    <span className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-light text-2xl font-bold shrink-0">
                      {(child.firstName || child.username || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="text-3xl font-bold text-dark">{child.firstName || child.username}</span>
                    {selected === child._id && (
                      <svg className="ml-auto w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => navigate("/signup/parent/add-child")}
                  className="btn-yellow w-full mt-2"
                >
                  Add Another Child
                </button>

                <p className="text-sm text-gray text-center">
                  Select a child to open their page, or add another.
                </p>
              </div>

              <div className="mt-8 lg:mt-0 lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 flex flex-col items-center gap-6 shrink-0">
                <button
                  type="button"
                  disabled={!selected}
                  onClick={goToStudent}
                  className="flex flex-col items-center justify-center gap-3 w-full max-w-[18rem] px-8 py-12 shrink-0 rounded-2xl bg-primary text-light text-lg font-semibold shadow-md transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  Go to Student Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentSection;
