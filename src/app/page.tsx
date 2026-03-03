"use client";

import Login from "./Login/page";
import './i18n';



// import Popup from './components/Popup';

export default function Home() {
  return (
    <div>

      <Login />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
      />
      {/* <Sidebar /> */}
      {/* <Dashboard/> */}
      {/* <Popup mainBoardId={''} closeModal={function (): void {
        throw new Error('Function not implemented.');
      } }/> */}
    </div>
  );
}
