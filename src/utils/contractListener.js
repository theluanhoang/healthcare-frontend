// utils/contractListener.js
export function setupContractListeners({
  contract,
  handleUserRegistered,
  handleDoctorVerified,
}) {
  console.log("Đã vào setupContractListeners");

  if (!contract) {
    console.log("No contract provided, skipping listener setup");
    return () => {};
  }

  console.log("Attaching listeners for contract:", contract);

  // Gắn listener cho UserRegistered
  let userRegisteredListener;
  if (typeof handleUserRegistered === "function") {
    userRegisteredListener = (user, role, fullName) => {
      console.log("Sự kiện UserRegistered đã được kích hoạt:", user, role, fullName);
      handleUserRegistered(user, role, fullName);
    };
    contract.on("UserRegistered", userRegisteredListener);
  }

  // Gắn listener cho DoctorVerified
  let doctorVerifiedListener;
  if (typeof handleDoctorVerified === "function") {
    doctorVerifiedListener = (doctor, doctorName) => {
      console.log("Sự kiện DoctorVerified đã được kích hoạt:", doctor, doctorName);
      handleDoctorVerified(doctor, doctorName);
    };
    contract.on("DoctorVerified", doctorVerifiedListener);
  }

  // Trả về cleanup function
  return () => {
    console.log("Cleaning up listeners for contract:", contract);
    if (userRegisteredListener) {
      contract.off("UserRegistered", userRegisteredListener);
    }
    if (doctorVerifiedListener) {
      contract.off("DoctorVerified", doctorVerifiedListener);
    }
  };
}