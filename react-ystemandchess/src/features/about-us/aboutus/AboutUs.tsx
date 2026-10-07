import React from 'react';
import aboutUsImage from "../../../assets/images/aboutUs/about-us.png"; // Replace with actual image path
import dividerIcon from "../../../assets/images/aboutUs/divide_icon.png"; // Replace with actual icon path
import statusIcon1 from "../../../assets/images/aboutUs/02.png"; // Replace with actual icon path
import statusIcon2 from "../../../assets/images/aboutUs/09.png"; // Replace with actual icon path
import statusIcon3 from "../../../assets/images/aboutUs/40.png"; // Replace with actual icon path
import studentsImage from "../../../assets/images/aboutUs/student.png"; // Replace with actual image path

const AboutUs = () => {
    return (
        <div className="p-5 font-sans text-dark md:p-10 lg:p-12">
            {/* Intro Section */}
            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold text-dark mb-4">About Us</h1>
                <p className="text-base md:text-lg lg:text-xl text-muted max-w-xl mx-auto leading-relaxed">
                    Welcome to our platform! We are committed to delivering top-notch educational resources
                    and connecting learners with the best opportunities. Our mission is to foster growth,
                    creativity, and success in students from all backgrounds.
                </p>
                <img src={aboutUsImage} alt="About Us" className="w-full max-w-md lg:max-w-lg mx-auto block rounded-lg shadow-md my-6" />
            </div>

            {/* Offer Section */}
            <div className="text-center my-10">
                <img src={dividerIcon} alt="Divider Icon" className="w-10 mb-2 mx-auto" />
                <h2 className="text-2xl md:text-3xl font-bold text-dark mb-4">What We Offer</h2>
                <p className="text-base md:text-lg lg:text-xl text-muted max-w-xl mx-auto">
                    We provide a variety of resources, including online courses, interactive workshops, and
                    personalized mentoring to help students excel in their educational and career journeys.
                </p>
            </div>

            {/* Status Section */}
            <div className="flex flex-col md:flex-row justify-center gap-5 mb-10">
                <div className="text-center p-4">
                    <img src={statusIcon1} alt="Status Icon 1" className="w-20 mb-2 mx-auto" />
                    <h3 className="text-3xl md:text-4xl font-bold text-dark">200+</h3>
                    <p className="text-base md:text-lg text-muted">Courses Offered</p>
                </div>
                <div className="text-center p-4">
                    <img src={statusIcon2} alt="Status Icon 2" className="w-20 mb-2 mx-auto" />
                    <h3 className="text-3xl md:text-4xl font-bold text-dark">10,000+</h3>
                    <p className="text-base md:text-lg text-muted">Students Enrolled</p>
                </div>
                <div className="text-center p-4">
                    <img src={statusIcon3} alt="Status Icon 3" className="w-20 mb-2 mx-auto" />
                    <h3 className="text-3xl md:text-4xl font-bold text-dark">98%</h3>
                    <p className="text-base md:text-lg text-muted">Satisfaction Rate</p>
                </div>
            </div>

            {/* Current Status Section */}
            <div className="bg-soft p-5 rounded-lg mb-10 text-center">
                <h2 className="text-xl md:text-2xl font-bold text-dark mb-4">Our Current Status</h2>
                <ul className="list-none p-0 max-w-2xl mx-auto">
                    <li className="flex items-center gap-2 mb-2 text-base md:text-lg text-muted">
                        <img src={dividerIcon} alt="Bullet Icon" className="w-4 h-4" />
                        Over 50 new courses in development.
                    </li>
                    <li className="flex items-center gap-2 mb-2 text-base md:text-lg text-muted">
                        <img src={dividerIcon} alt="Bullet Icon" className="w-4 h-4" />
                        Partnering with industry leaders to create specialized programs.
                    </li>
                    <li className="flex items-center gap-2 mb-2 text-base md:text-lg text-muted">
                        <img src={dividerIcon} alt="Bullet Icon" className="w-4 h-4" />
                        Expanding to more regions worldwide.
                    </li>
                    <li className="flex items-center gap-2 mb-2 text-base md:text-lg text-muted">
                        <img src={dividerIcon} alt="Bullet Icon" className="w-4 h-4" />
                        Launching mobile applications for easier access.
                    </li>
                </ul>
            </div>

            {/* Description Section */}
            <div className="bg-light p-8 rounded-lg text-center mt-5">
                <p className="text-sm md:text-base lg:text-lg text-muted max-w-3xl mx-auto mb-5 leading-relaxed">
                    Our team of dedicated educators, developers, and industry professionals works tirelessly
                    to bring students the most relevant and impactful educational content. We believe in
                    empowering students to reach their full potential by providing them with the tools and
                    knowledge they need to succeed in an ever-changing world.
                </p>
                <img src={studentsImage} alt="Students Engaged in Learning" className="w-full max-w-xs md:max-w-sm mx-auto block rounded-lg shadow-md my-6" />
            </div>
        </div>
    );
};
export default AboutUs;
