import React from "react";
import { useState } from 'react';
import { environment } from "../../../environments";
import { useCookies } from 'react-cookie';
import stemmy from "../../../assets/images/StreakProgressAssets/stemmy.svg";
import stemette from "../../../assets/images/StreakProgressAssets/stemette.svg";
import treesGroup from "../../../assets/images/Trees-Group.png";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cookies, setCookie] = useCookies(["login"]);
  const [loginError, setLoginError] = useState("");
  const [usernameFlag, setUsernameFlag] = useState(false);
  const [passwordFlag, setPasswordFlag] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const usernameVerification = () => {
    if (username.length > 2) {
      setUsernameFlag(false);
    } else {
      setUsernameFlag(true);
    }
  };

  const passwordVerification = () => {
    if (password.length < 8) {
      setPasswordFlag(true);
    } else {
      console.log('verifying pw')
      setPasswordFlag(false);
    }
  };

  const errorMessages = () => {
    if (passwordFlag === true || usernameFlag === true) {
      setLoginError('Invalid username or password');
    } else {
      setLoginError("");
    }
  };

  const submitLogin = (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    // errorMessages();
    if (password.length < 8 || username.length <= 2) {
      setUsernameFlag(true);
      setPasswordFlag(true);
      setLoginError('Invalid username or password');
      setIsLoading(false);
      return;
    } else {
      setLoginError("");
    }

    let url = `${environment.urls.middlewareURL}/auth/login?username=${username}&password=${password}`;

    const httpGetAsync = (theUrl: string, callback: any, onError: any) => {
      let xmlHttp = new XMLHttpRequest();
      xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState === 4) {
          if (xmlHttp.status >= 200 && xmlHttp.status < 300) {
            callback(xmlHttp.responseText);
          } else {
            if (onError) {
              onError();
            }
          }
        }
      };
      xmlHttp.open("POST", theUrl, true);
      xmlHttp.send(null);
    };

    httpGetAsync(url, (response: any) => {
      if (response === 'The username or password is incorrect.') {
        setLoginError('The username or password is incorrect.');
        setIsLoading(false);
      } else {
        const expires = new Date();
        expires.setDate(expires.getDate() + 1);
        setCookie('login', JSON.parse(response).token, { expires });

        let payload = JSON.parse(atob(response.split(".")[1]));
        console.log(payload);

        switch (payload["role"]) {
          case "student":
            window.location.pathname = "/student-profile";
            console.log(payload["role"]);
            break;
          case "parent":
            window.location.pathname = "/signup/parent/section";
            break;
          case "mentor":
            window.location.pathname = "/mentor-profile";
            break;
          case "admin":
            window.location.pathname = "/admin";
            break;
          default:
            window.location.pathname = "";
        }
        setIsLoading(false);
      }
    }, () => {
      setLoginError('The username or password is incorrect.');
      setIsLoading(false);
    });
  };

  const inputClass = (invalid: boolean) =>
    `w-full rounded-lg border-2 px-4 py-3 text-sm text-dark bg-white caret-dark
     focus:outline-none focus:shadow-none transition-colors ${
      invalid ? "border-red" : "border-borderLight focus:border-primary"
    }`;

  return (
    <div className="relative min-h-[71vh] flex flex-col items-center justify-center px-4 py-12 overflow-x-hidden">
      <img
        src={treesGroup}
        alt=""
        aria-hidden="true"
        className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-[36rem] xl:w-[40rem] h-auto pointer-events-none"
      />

      <img
        src={stemmy}
        alt=""
        aria-hidden="true"
        className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-72 xl:w-80 h-auto pointer-events-none translate-x-[10%]"
      />

      <h1 className="text-3xl font-bold text-dark mb-6 text-center">Login</h1>

      {loginError && (
        <p className="text-red font-semibold mb-4 text-center" role="alert">
          {loginError}
        </p>
      )}

      <form
        className="relative w-full max-w-sm bg-light rounded-2xl border-2 border-dark shadow-md p-8 flex flex-col gap-6"
        aria-label="Login Form"
        aria-busy={isLoading}
        onSubmit={submitLogin}
      >
        <img
          src={stemette}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-60 h-auto"
        />
        <img
          src={stemmy}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-14 -left-24 -translate-y-1/2 w-24 h-auto"
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="username" id="username-label" className="text-sm font-bold text-dark">
            Username
          </label>
          <input
            type="text"
            name="username"
            id="username"
            placeholder="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              //usernameVerification();
            }}
            aria-describedby="loginError-h3"
            aria-invalid={usernameFlag}
            required
            className={inputClass(usernameFlag)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" id="password-label" className="text-sm font-bold text-dark">
            Password
          </label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              //passwordVerification();
            }}
            aria-describedby="loginError-h3"
            aria-invalid={passwordFlag}
            required
            className={inputClass(passwordFlag)}
          />
        </div>

        <div className="flex justify-center pt-2">
          <button
            type="submit"
            aria-label="Login Button"
            disabled={isLoading}
            className="btn-green px-10"
          >
            Enter
          </button>
        </div>
      </form>

      <nav
        className="mt-6 flex flex-wrap justify-center gap-6 text-sm font-bold"
        aria-label="Account Options"
      >
        <a
          href="/reset-password"
          className="text-dark border-b-2 border-transparent hover:border-dark transition-colors"
        >
          Forgot password?
        </a>
      </nav>
    </div>
  );
};

export default Login;
