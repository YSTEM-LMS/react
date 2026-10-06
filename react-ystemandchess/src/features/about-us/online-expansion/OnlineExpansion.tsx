import React from "react";
import "./OnlineExpansion.scss"; // Using matching SCSS format
import Images from "../../../assets/images/imageImporter";

const OnlineExpansion = () => {
  return (
    <main id="main-content-online" role="main">
      <section className="container-online" role="region" aria-label="Main online expansion section" tabIndex={0}>
        <div className="text-title-md-online txt-p">
          <h1 style={{ fontWeight: "bold" }}>The Importance of Online Expansion of Y Stem and Chess Inc.</h1>
        </div>

        <figure>
          <img
            className="picture-online"
            src={Images.mathComputerImg}
            alt="Students practicing chess on computers"
          />
          <figcaption className="text-caption-online txt-p">
            Students practicing their chess skills in the classroom
          </figcaption>
        </figure>

        <div className="text-normal-online txt-p">
          <p>
            The Importance of Online Expansion of Y STEM and Chess Inc. focuses
            on using technology to scale. Yes, we are nonprofit but more
            fundamentally we are a technology company. Technology will help
            individualize lessons in chess, math, and computer science.
            Individualized lessons will be conducted online via our website to
            help rural and urban communities that lack access to resources in
            High School or pay for courses at other institutions. The rural and
            urban companies simply don’t have the resources to prepare students
            for success in STEM. Using the proven aspects of our program, we can
            change the future of students that have largely been excluded from
            the high-paying jobs that STEM provides while increasing inclusivity
            and lowering poverty.
          </p>
        </div>
      </section>

      <section className="rectdiv2Online" role="region" aria-label="Quote section" tabIndex={0}>
        <div className="rectdiv2-wrapper">
          <p className="recttextonline">
            "Our goal is to have all our students feel that they belong because they do"
          </p>
        </div>
      </section>

      <section className="container-online" role="region" aria-label="Online expansion details section" tabIndex={0}>
        <div className="text-normal-online txt-p">
          <p>
            The development of our curriculum online will accelerate the expansion
            of our program by lowering the cost and the logistical concerns for
            mentors. Most mentors come from STEM backgrounds and are located in
            cities. By moving the program online, they can easily mentor from
            work, school, or home and reach students in rural communities here in
            Idaho. We can turn Idaho into a STEM powerhouse in just a few years.
          </p>
        </div>

        <div className="text-normal-online txt-p">
          <p>
            Once we refine our curriculum and approach, YSC will roll out our
            program in other geographic and demographic regions across the
            country. This will provide critical feedback that will help ease the
            challenges of expansion. The more mentors we have, the more students
            we can get into the program, and the faster we can fill STEM-related
            jobs.
          </p>
        </div>

        <div className="text-normal-online txt-p">
          <p>
            Online access by students and mentors will allow us to quickly scale
            our program and curriculum. It eliminates geographical supply issues
            regarding mentors that can play chess, tutor math, or teach computer
            science. Our mentors will be primarily focused on relationship building
            and student community development. Our goal is to have all our
            students feel that they belong because they do. Think of our mentors as
            the Big Brothers and Big Sisters of STEM. Mentors are the critical
            support factor in a student’s STEM success.
          </p>
        </div>

        <figure>
          <img
            className="pictureOnline"
            src={Images.mathChampImg}
            alt="A student standing and holding a trophy alongside their mentor."
          />
          <figcaption className="text-caption-online txt-p">
            A student with their mentor after winning an award.
          </figcaption>
        </figure>

        <div className="text-normal-online txt-p">
          <p>
            The greater access we have to schools and school districts we will
            have greater access to middle-class families and above. We offer our
            platform for free to our community partners like schools but we
            charge the families that can afford our service. We charge just $25 a
            week per lesson and that has kept us profitable over the last 2
            years. The greater our reach the greater our donations and the more
            students we can help through our free program.
          </p>
        </div>

        <div className="text-normal-online txt-p">
          <p>
            Students love having control of their learning because they feel
            empowered. Most of the students we focus on come from challenging
            backgrounds and will benefit greatly from the positive attention. As
            will their families and communities.
          </p>
        </div>
      </section>
    </main>
  );
};

export default OnlineExpansion; 
