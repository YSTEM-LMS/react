import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useCookies } from "react-cookie";
import { environment } from "../../environments";
const Admin = () => {
  const navigate = useNavigate();
  // verify admin status
  const [cookies, setCookie] = useCookies(["login"]);

  // search input
  const [searchInput, setSearchInput] = useState<string>();

  const [error, setError] = useState<any>();

  // students
  const [studentNames, setStudentNames] = useState<[string] | undefined>();

  // can't find the User type in global.d.ts
  const [students, setStudents] = useState<any>([]);
  // temporary
  const [verified, setVerified] = useState<boolean>(false);

  //.
  //.
  useEffect(() => {
    // server url
    let url = `${environment.urls.middlewareURL}/user/verifyRole`;
    const verifyAdmin = async () => {
      try {
        const token = cookies; // Read JWT from cookie
        if (!token) throw new Error("No token");

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            claimedRole: "admin",
          }),
        });
        const data = await response.json();
        if (response.ok) {
          setVerified(data.verified);
        } else {
          throw new Error(data.error || "Role verification failed");
        }

        // User is verified as admin
      } catch (err) {
        console.error("Access denied:", err.message);
        navigate("/");
      }
    };
    verifyAdmin();
  }, []);

  // search
  const handleStudentSearch = async () => {
    if (!verified) {
      navigate("/");
      return;
    }
    setStudentNames(undefined);
    setStudents([]);
    let url = `${environment.urls.middlewareURL}/user/getStudent?keyword=${searchInput}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Throws an error if the response status is failure.
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data, "--->");
      setStudentNames(data);
    } catch {
      console.error("Search error:", error);
      // Sets a general error message for signup failure.
      setError("Search failed");
    }
  };

  // get basic info about found students
  useEffect(() => {
    if (!studentNames) {
      return;
    }
    for (let i = 0; i < studentNames.length; i++) {
      let url = `${environment.urls.middlewareURL}/user/getUser?username=${studentNames[i]}`;
      try {
        const getUser = async () => {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          const data = await response.json();
          setStudents((prevStudent) => [...prevStudent, data]);
        };
        getUser();
      } catch (err) {
        console.log(err);
      }
    }
  }, [studentNames]);
  return (
    <div>
      <form
        action="submit"
        className="flex items-center p-4 w-full border-b border-gray-300"
        onSubmit={(e) => {
          e.preventDefault();
          handleStudentSearch();
        }}
      >
        <input
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-[100%]"
          type="text"
          name="username"
          // value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
          }}
          placeholder="Type student username to search"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          type="submit"
        >
          Search
        </button>
      </form>
      {/* students searched */}
      <div>
        <div className="p-6 bg-gray-50 min-h-screen flex justify-center">
          <div className="w-full max-w-2xl">
            <div className="space-y-4">
              {students.map((student) => (
                <div
                  key={student._id}
                  className="bg-white p-4 border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:bg-gray-100 transition duration-200"
                  onClick={() => {
                    // to the student's profile
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-medium text-gray-800">
                      {student.firstName} {student.lastName}{" "}
                      <span className="text-sm text-gray-500">
                        ({student.username})
                      </span>
                    </h2>
                    <span className="text-sm text-gray-500">
                      Role: {student.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Email: {student.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    Account Created: {student.accountCreatedAt}
                  </p>
                  <p className="text-sm text-gray-600">
                    Lessons Completed: {student.lessonsCompleted.length}
                  </p>
                  <p className="text-sm text-gray-600">
                    Time Played: {student.timePlayed} mins
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
