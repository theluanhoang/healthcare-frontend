// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Healthcare {
    enum Role { NONE, PATIENT, DOCTOR }
    enum RecordType { NONE, EXAMINATION_RECORD, TEST_RESULT, PRESCRIPTION }
    enum AppointmentStatus { PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED }

    struct User {
        Role role;
        bool isVerified;
        string ipfsHash;
        string fullName;
        string email;
    }

    struct MedicalRecord {
        address patient;
        address doctor;
        string ipfsHash;
        RecordType recordType;
        uint256 timestamp;
        bool isApproved;
    }

    struct SharedRecord {
        address patient;
        address doctor;
        string ipfsHash;
        RecordType recordType;
        uint256 timestamp;
        string notes;
    }

    // Thêm struct cho Appointment
    struct Appointment {
        uint256 id;
        address patient;
        address doctor;
        string date;
        string time;
        string reason;
        AppointmentStatus status;
        uint256 timestamp;
    }

    // Thêm struct cho Doctor Availability
    struct AvailabilitySlot {
        string date;
        string startTime;
        string endTime;
        bool isBooked;
        uint256 appointmentId;
    }

    address[] public userAddresses;
    mapping(address => User) public users;
    mapping(address => uint256) public verificationVotes;
    MedicalRecord[] public medicalRecords;
    SharedRecord[] public sharedRecords;
    uint256 public verifiedDoctorCount;

    // Thêm mappings cho appointment system
    Appointment[] public appointments;
    mapping(address => AvailabilitySlot[]) public doctorAvailability;
    uint256 public appointmentCounter;

    // Thêm mapping cho access control
    mapping(address => mapping(address => bool)) public patientDoctorAccess; // patient => doctor => hasAccess

    event UserRegistered(address indexed user, Role role, string fullName);
    event DoctorVerified(address indexed doctor, string fullName);
    event MedicalRecordAdded(uint256 indexed recordIndex, address indexed patient, address indexed doctor, string ipfsHash);
    event MedicalRecordApproved(uint256 indexed recordIndex, address indexed patient);
    event MedicalRecordShared(uint256 indexed recordIndex, address indexed patient, address indexed doctor, string ipfsHash);
    
    // Thêm events cho appointment system
    event AppointmentCreated(uint256 indexed appointmentId, address indexed patient, address indexed doctor, string date, string time);
    event AppointmentStatusUpdated(uint256 indexed appointmentId, AppointmentStatus status);
    event AvailabilityAdded(address indexed doctor, string date, string startTime, string endTime);
    
    // Thêm event cho access control
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);

    constructor() {
        userAddresses.push(msg.sender);
        users[msg.sender] = User(Role.DOCTOR, true, "", "Admin Doctor", "admin@healthcare.com");
        verificationVotes[msg.sender] = 1;
        verifiedDoctorCount = 1;
        appointmentCounter = 1;
        emit UserRegistered(msg.sender, Role.DOCTOR, "Admin Doctor");
        emit DoctorVerified(msg.sender, "Admin Doctor");
    }

    function register(string memory fullName, string memory email, Role role, string memory ipfsHash) public {
        require(users[msg.sender].role == Role.NONE, "User already registered");
        require(role == Role.PATIENT || role == Role.DOCTOR, "Invalid role");

        users[msg.sender] = User(role, role == Role.PATIENT, ipfsHash, fullName, email);
        userAddresses.push(msg.sender);
        emit UserRegistered(msg.sender, role, fullName);
    }

    function voteForDoctor(address doctorAddress) public {
        require(users[msg.sender].role == Role.DOCTOR && users[msg.sender].isVerified, "Only verified doctors can vote");
        require(users[doctorAddress].role == Role.DOCTOR && !users[doctorAddress].isVerified, "Invalid doctor");
        require(verificationVotes[doctorAddress] < verifiedDoctorCount, "Doctor already verified");

        verificationVotes[doctorAddress]++;
        if (verificationVotes[doctorAddress] >= (verifiedDoctorCount / 2) + 1) {
            users[doctorAddress].isVerified = true;
            verifiedDoctorCount++;
            emit DoctorVerified(doctorAddress, users[doctorAddress].fullName);
        }
    }

    function addMedicalRecord(address patient, string memory ipfsHash, RecordType recordType) public {
        require(users[msg.sender].role == Role.DOCTOR && users[msg.sender].isVerified, "Only verified doctors can add records");
        require(users[patient].role == Role.PATIENT && users[patient].isVerified, "Invalid patient");
        require(recordType != RecordType.NONE, "Invalid record type");

        medicalRecords.push(MedicalRecord(patient, msg.sender, ipfsHash, recordType, block.timestamp, false));
        emit MedicalRecordAdded(medicalRecords.length - 1, patient, msg.sender, ipfsHash);
    }

    function approveMedicalRecord(uint256 recordIndex) public {
        require(recordIndex < medicalRecords.length, "Invalid record index");
        MedicalRecord storage record = medicalRecords[recordIndex];
        require(msg.sender == record.patient, "Only patient can approve");
        require(!record.isApproved, "Record already approved");

        record.isApproved = true;
        emit MedicalRecordApproved(recordIndex, msg.sender);
    }

    function shareMedicalRecord(address doctor, string memory ipfsHash, RecordType recordType, string memory notes) public {
        require(users[msg.sender].role == Role.PATIENT && users[msg.sender].isVerified, "Only verified patients can share");
        require(users[doctor].role == Role.DOCTOR && users[doctor].isVerified, "Invalid doctor");
        require(recordType != RecordType.NONE, "Invalid record type");

        sharedRecords.push(SharedRecord(msg.sender, doctor, ipfsHash, recordType, block.timestamp, notes));
        emit MedicalRecordShared(sharedRecords.length - 1, msg.sender, doctor, ipfsHash);
    }

    // Thêm functions cho Access Control
    function grantAccessToDoctor(address doctor) public {
        require(users[msg.sender].role == Role.PATIENT && users[msg.sender].isVerified, "Only verified patients can grant access");
        require(users[doctor].role == Role.DOCTOR && users[doctor].isVerified, "Invalid doctor");
        require(!patientDoctorAccess[msg.sender][doctor], "Access already granted");

        patientDoctorAccess[msg.sender][doctor] = true;
        emit AccessGranted(msg.sender, doctor);
    }

    function revokeAccessFromDoctor(address doctor) public {
        require(users[msg.sender].role == Role.PATIENT && users[msg.sender].isVerified, "Only verified patients can revoke access");
        require(patientDoctorAccess[msg.sender][doctor], "Access not granted");

        patientDoctorAccess[msg.sender][doctor] = false;
        emit AccessRevoked(msg.sender, doctor);
    }

    function hasAccessToPatient(address patient, address doctor) public view returns (bool) {
        return patientDoctorAccess[patient][doctor];
    }

    // Thêm functions cho Appointment System
    function addAvailabilitySlot(string memory date, string memory startTime, string memory endTime) public {
        require(users[msg.sender].role == Role.DOCTOR && users[msg.sender].isVerified, "Only verified doctors can add availability");
        
        doctorAvailability[msg.sender].push(AvailabilitySlot(date, startTime, endTime, false, 0));
        emit AvailabilityAdded(msg.sender, date, startTime, endTime);
    }

    function bookAppointment(address doctor, string memory date, string memory time, string memory reason) public {
        require(users[msg.sender].role == Role.PATIENT && users[msg.sender].isVerified, "Only verified patients can book appointments");
        require(users[doctor].role == Role.DOCTOR && users[doctor].isVerified, "Invalid doctor");

        uint256 appointmentId = appointmentCounter++;
        appointments.push(Appointment(appointmentId, msg.sender, doctor, date, time, reason, AppointmentStatus.PENDING, block.timestamp));
        
        emit AppointmentCreated(appointmentId, msg.sender, doctor, date, time);
    }

    function updateAppointmentStatus(uint256 appointmentId, AppointmentStatus status) public {
        require(appointmentId > 0 && appointmentId < appointmentCounter, "Invalid appointment ID");
        
        bool found = false;
        for (uint256 i = 0; i < appointments.length; i++) {
            if (appointments[i].id == appointmentId) {
                require(appointments[i].doctor == msg.sender, "Only assigned doctor can update status");
                appointments[i].status = status;
                found = true;
                break;
            }
        }
        require(found, "Appointment not found");
        
        emit AppointmentStatusUpdated(appointmentId, status);
    }

    // Getter functions
    function getUser(address userAddress) public view returns (Role, bool, string memory, string memory, string memory) {
        User memory user = users[userAddress];
        return (user.role, user.isVerified, user.ipfsHash, user.fullName, user.email);
    }

    function getAllDoctors() public view returns (address[] memory, bool[] memory, string[] memory, string[] memory) {
        uint256 doctorCount = 0;
        for (uint256 i = 0; i < userAddresses.length; i++) {
            if (users[userAddresses[i]].role == Role.DOCTOR) {
                doctorCount++;
            }
        }

        address[] memory addresses = new address[](doctorCount);
        bool[] memory isVerified = new bool[](doctorCount);
        string[] memory fullNames = new string[](doctorCount);
        string[] memory ipfsHashes = new string[](doctorCount);
        uint256 index = 0;

        for (uint256 i = 0; i < userAddresses.length; i++) {
            if (users[userAddresses[i]].role == Role.DOCTOR) {
                addresses[index] = userAddresses[i];
                isVerified[index] = users[userAddresses[i]].isVerified;
                fullNames[index] = users[userAddresses[i]].fullName;
                ipfsHashes[index] = users[userAddresses[i]].ipfsHash;
                index++;
            }
        }

        return (addresses, isVerified, fullNames, ipfsHashes);
    }

    function getMedicalRecords(address patient) public view returns (MedicalRecord[] memory) {
        uint256 recordCount = 0;
        for (uint256 i = 0; i < medicalRecords.length; i++) {
            if (medicalRecords[i].patient == patient) {
                recordCount++;
            }
        }

        MedicalRecord[] memory result = new MedicalRecord[](recordCount);
        uint256 index = 0;
        for (uint256 i = 0; i < medicalRecords.length; i++) {
            if (medicalRecords[i].patient == patient) {
                result[index] = medicalRecords[i];
                index++;
            }
        }
        return result;
    }

    function getMedicalRecordsByDoctor(address doctor) public view returns (MedicalRecord[] memory) {
        uint256 recordCount = 0;
        for (uint256 i = 0; i < medicalRecords.length; i++) {
            if (medicalRecords[i].doctor == doctor) {
                recordCount++;
            }
        }

        MedicalRecord[] memory result = new MedicalRecord[](recordCount);
        uint256 index = 0;
        for (uint256 i = 0; i < medicalRecords.length; i++) {
            if (medicalRecords[i].doctor == doctor) {
                result[index] = medicalRecords[i];
                index++;
            }
        }
        return result;
    }

    function getAllMedicalRecords() public view returns (MedicalRecord[] memory) {
        return medicalRecords;
    }

    function getMedicalRecordsByType(address patient, RecordType recordType) public view returns (MedicalRecord[] memory) {
        require(recordType != RecordType.NONE, "Invalid record type");

        uint256 recordCount = 0;
        for (uint256 i = 0; i < medicalRecords.length; i++) {
            if (medicalRecords[i].patient == patient && medicalRecords[i].recordType == recordType) {
                recordCount++;
            }
        }

        MedicalRecord[] memory result = new MedicalRecord[](recordCount);
        uint256 index = 0;
        for (uint256 i = 0; i < medicalRecords.length; i++) {
            if (medicalRecords[i].patient == patient && medicalRecords[i].recordType == recordType) {
                result[index] = medicalRecords[i];
                index++;
            }
        }
        return result;
    }

    function getPendingRecords(address patient) public view returns (MedicalRecord[] memory) {
        uint256 recordCount = 0;
        for (uint256 i = 0; i < medicalRecords.length; i++) {
            if (medicalRecords[i].patient == patient && !medicalRecords[i].isApproved) {
                recordCount++;
            }
        }

        MedicalRecord[] memory result = new MedicalRecord[](recordCount);
        uint256 index = 0;
        for (uint256 i = 0; i < medicalRecords.length; i++) {
            if (medicalRecords[i].patient == patient && !medicalRecords[i].isApproved) {
                result[index] = medicalRecords[i];
                index++;
            }
        }
        return result;
    }

    function getPatientSharedRecords(address patient) public view returns (SharedRecord[] memory) {
        uint256 recordCount = 0;
        for (uint256 i = 0; i < sharedRecords.length; i++) {
            if (sharedRecords[i].patient == patient) {
                recordCount++;
            }
        }

        SharedRecord[] memory result = new SharedRecord[](recordCount);
        uint256 index = 0;
        for (uint256 i = 0; i < sharedRecords.length; i++) {
            if (sharedRecords[i].patient == patient) {
                result[index] = sharedRecords[i];
                index++;
            }
        }
        return result;
    }

    // Thêm function để bác sĩ xem hồ sơ được chia sẻ
    function getSharedRecordsByDoctor(address doctor) public view returns (SharedRecord[] memory) {
        uint256 recordCount = 0;
        for (uint256 i = 0; i < sharedRecords.length; i++) {
            if (sharedRecords[i].doctor == doctor) {
                recordCount++;
            }
        }

        SharedRecord[] memory result = new SharedRecord[](recordCount);
        uint256 index = 0;
        for (uint256 i = 0; i < sharedRecords.length; i++) {
            if (sharedRecords[i].doctor == doctor) {
                result[index] = sharedRecords[i];
                index++;
            }
        }
        return result;
    }

    // Thêm function để lấy danh sách bệnh nhân đã cấp quyền cho bác sĩ
    function getAuthorizedPatients(address doctor) public view returns (address[] memory, string[] memory) {
        uint256 patientCount = 0;
        
        // Đếm số bệnh nhân đã cấp quyền
        for (uint256 i = 0; i < userAddresses.length; i++) {
            if (users[userAddresses[i]].role == Role.PATIENT && patientDoctorAccess[userAddresses[i]][doctor]) {
                patientCount++;
            }
        }

        address[] memory patientAddresses = new address[](patientCount);
        string[] memory patientNames = new string[](patientCount);
        uint256 index = 0;

        for (uint256 i = 0; i < userAddresses.length; i++) {
            if (users[userAddresses[i]].role == Role.PATIENT && patientDoctorAccess[userAddresses[i]][doctor]) {
                patientAddresses[index] = userAddresses[i];
                patientNames[index] = users[userAddresses[i]].fullName;
                index++;
            }
        }

        return (patientAddresses, patientNames);
    }

    // Thêm functions cho appointment system
    function getAppointmentsByPatient(address patient) public view returns (Appointment[] memory) {
        uint256 appointmentCount = 0;
        for (uint256 i = 0; i < appointments.length; i++) {
            if (appointments[i].patient == patient) {
                appointmentCount++;
            }
        }

        Appointment[] memory result = new Appointment[](appointmentCount);
        uint256 index = 0;
        for (uint256 i = 0; i < appointments.length; i++) {
            if (appointments[i].patient == patient) {
                result[index] = appointments[i];
                index++;
            }
        }
        return result;
    }

    function getAppointmentsByDoctor(address doctor) public view returns (Appointment[] memory) {
        uint256 appointmentCount = 0;
        for (uint256 i = 0; i < appointments.length; i++) {
            if (appointments[i].doctor == doctor) {
                appointmentCount++;
            }
        }

        Appointment[] memory result = new Appointment[](appointmentCount);
        uint256 index = 0;
        for (uint256 i = 0; i < appointments.length; i++) {
            if (appointments[i].doctor == doctor) {
                result[index] = appointments[i];
                index++;
            }
        }
        return result;
    }

    function getDoctorAvailability(address doctor) public view returns (AvailabilitySlot[] memory) {
        return doctorAvailability[doctor];
    }

    function getVerifiedDoctorCount() public view returns (uint256) {
        return verifiedDoctorCount;
    }

    function getUserAddressesLength() public view returns (uint256) {
        return userAddresses.length;
    }
}
