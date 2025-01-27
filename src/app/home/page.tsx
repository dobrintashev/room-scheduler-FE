"use client";

import {useRouter} from "next/navigation";
import React, {useEffect, useState} from "react";
import {SELECTED_ROOM, TOKEN} from "@/app/constants/login";
import {
    AVAILABLE_ROOMS_INTERVAL, AVAILABLE_ROOMS_STYLES, DATE_PATTERN,
    FETCH_CALENDAR_INTERVAL, OVERLAY_STYLES,
    ROOM_STATUSES,
    TIME_UPDATE_INTERVAL, TIMEZONE
} from "@/app/constants/home";
import {roomEmailToNumberMap} from "@/app/mappers/roomMapper";
import {toast, ToastContainer} from "react-toastify";
import {BASE_URL} from "@/app/config/config";
import {fetchHelper} from "@/app/helpers/fetchHelper";
import {getToken} from "@/app/helpers/getTokenHelper";
import {Box, Button, List, ListItem, ListItemButton, Modal, Typography} from "@mui/material";
import {addMinutes, format, isWithinInterval} from "date-fns";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCalendarPlus, faX} from '@fortawesome/free-solid-svg-icons';
import "../../assets/styles/home.scss"

interface Meeting {
    subject: string;
    start: {
        dateTime: string;
    };
    end: {
        dateTime: string;
    };
}

const HomePage = () => {
    const router = useRouter();

    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [todaysMeetings, setTodaysMeetings] = useState<Meeting[]>([]);
    const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
    const [roomStatus, setRoomStatus] = useState<string | null>(null);
    const [overlayStyles, setOverlayStyles] = useState<string | null>(null);
    const [availableRoomsStyles, setAvailableRoomsStyles] = useState<string | null>(null);
    const [startingSoonMeetingMinutes, setStartingSoonMeetingMinutes] =
        useState<number>(0);
    const [busyRoomMeetings, setBusyRoomMeetings] = useState<Meeting[]>([]);
    const [schedules, setSchedules] = useState(null);
    const [availableRooms, setAvailableRooms] = useState<string[] | null>(null);
    const [selectedOption, setSelectedOption] = useState<string>("");
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [availableRoomInterval, setAvailableRoomInterval] = useState<string | null>(null);

    // Redirect to log in if no token or room is selected
    useEffect(() => {
        if (!sessionStorage.getItem(SELECTED_ROOM) || !sessionStorage.getItem(TOKEN)) {
            sessionStorage.clear();
            router.push("/login");
        }
    }, []);

    useEffect(() => {
        if (availableRooms) {
            const timer = setTimeout(() => {
                setAvailableRooms(null);
                setSelectedOption("");
                setIsModalOpen(false);
            }, AVAILABLE_ROOMS_INTERVAL);

            return () => clearTimeout(timer);
        }
    }, [availableRooms]);

    useEffect(() => {
        getInitialCalendar();
        const tokenTimer = setInterval(getInitialCalendar, FETCH_CALENDAR_INTERVAL);
        return () => clearInterval(tokenTimer);
    }, []);

    const getInitialCalendar = async () => {
        const data = await getRoomSchedule();
        if (!data) return;

        setSchedules(data.value);
        const selectedRoomEmail = sessionStorage.getItem(SELECTED_ROOM);
        const selectedRoomNumber = roomEmailToNumberMap[selectedRoomEmail!];
        getCurrentRoomSchedule(data, selectedRoomNumber);
    };

    const getRoomSchedule = async () => {
        try {
            const token = sessionStorage.getItem(TOKEN);
            return await fetchRoomsSchedule(token!);
        } catch (error) {
            console.log(error)
            toast.error("Error getting rooms schedule");
        }
    };

    const fetchRoomsSchedule = async (token: string) => {
        try {
            const getRoomsScheduleUrl = `${BASE_URL}/fetch-calendar/rooms`;
            const response = await fetchHelper(getRoomsScheduleUrl, token);

            if (!response.ok) {
                if (response.status === 401) {
                    const newToken = await getToken();
                    sessionStorage.setItem(TOKEN, newToken);
                    return getRoomSchedule();
                } else {
                    toast.error(`Failed to fetch rooms calendar: ${response.status}`);
                }
            }
            return response.json();
        } catch (error) {
            console.log(error);
            toast.error("Failed to fetch rooms calendar");
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, TIME_UPDATE_INTERVAL);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            if (todaysMeetings) checkMeetingStatus(todaysMeetings);
        }, TIME_UPDATE_INTERVAL);

        return () => clearInterval(timer);
    }, [todaysMeetings]);

    const getCurrentRoomSchedule = (data: any, selectedRoomNumber: string) => {
        const roomSchedule = data.value.find((item: any) =>
            item.scheduleId.includes(selectedRoomNumber)
        );
        if (roomSchedule) filterTodaysMeetings(roomSchedule.scheduleItems);
    };

    const filterTodaysMeetings = (currentRoomSchedules: any) => {
        const todayMeetings = currentRoomSchedules.filter((meeting: Meeting) =>
            isSameDate(new Date(meeting.start.dateTime))
        );
        setTodaysMeetings(todayMeetings.slice(0, 4));
    };

    const isSameDate = (date: Date) => {
        const now = new Date();
        return (
            now.getFullYear() === date.getFullYear() &&
            now.getMonth() === date.getMonth() &&
            now.getDate() === date.getDate()
        );
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    };

    const formatMeetingsTime = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const checkMeetingStatus = (roomSchedules: any) => {
        const now = new Date();
        let status = ROOM_STATUSES.AVAILABLE;
        let ongoingMeeting = null;

        for (const meeting of roomSchedules) {
            const meetingStart = new Date(meeting.start.dateTime);
            const meetingEnd = addMinutes(new Date(meeting.end.dateTime), 1);

            if (isWithinInterval(now, {start: meetingStart, end: meetingEnd})) {
                status = ROOM_STATUSES.BUSY;
                ongoingMeeting = meeting;
                break;
            }
        }

        if (status === ROOM_STATUSES.AVAILABLE && roomSchedules.length > 0) {
            const minutesUntilStart = calculateDifferenceInMinutes(
                roomSchedules[0].start.dateTime
            );
            setStartingSoonMeetingMinutes(minutesUntilStart);

            if (minutesUntilStart > 0 && minutesUntilStart <= 15) {
                status = ROOM_STATUSES.STARTING_SOON;
            }
        }

        updateRoomStatus(status);
        setCurrentMeeting(ongoingMeeting);
    };

    const calculateDifferenceInMinutes = (timestamp: string) => {
        const now = new Date();
        const differenceInMillis = new Date(timestamp).getTime() - now.getTime();
        return Math.ceil(differenceInMillis / (1000 * 60));
    };

    const updateRoomStatus = (status: string) => {
        switch (status) {
            case ROOM_STATUSES.BUSY:
                setOverlayStyles(OVERLAY_STYLES.BUSY);
                setRoomStatus(ROOM_STATUSES.BUSY);
                setAvailableRoomsStyles(AVAILABLE_ROOMS_STYLES.BUSY);
                setBusyRoomMeetings(todaysMeetings.slice(1, 5));
                break;
            case ROOM_STATUSES.STARTING_SOON:
                setOverlayStyles(OVERLAY_STYLES.STARTING_SOON);
                setRoomStatus(ROOM_STATUSES.STARTING_SOON);
                break;
            default:
                setOverlayStyles(OVERLAY_STYLES.AVAILABLE);
                setRoomStatus(ROOM_STATUSES.AVAILABLE);
                setBusyRoomMeetings([]);
                break;
        }
    };

    const getAvailableRooms = (scheduleResponse: any, currentRoom: string, excludedRoom: string) => {
        const currentRoomNumber = +currentRoom;
        const excludedRoomNumber = +excludedRoom;
        const availableRooms = filterAvailableRooms(scheduleResponse, excludedRoomNumber);

        return sortRoomsBasedOnDistance(availableRooms, currentRoomNumber);
    };

    const filterAvailableRooms = (scheduleResponse: any, excludedRoomNumber: number) => {
        return scheduleResponse && scheduleResponse
            .filter((room: any) => {
                const roomNumber = +roomEmailToNumberMap[room.scheduleId];
                // return roomNumber;
                // TODO change to return roomNumber when 404 room does not exist anymore
                return roomNumber !== excludedRoomNumber;
            })
            .filter((room: any) => checkRoomAvailability(room.scheduleItems));
    }

    const sortRoomsBasedOnDistance = (availableRooms: any, currentRoomNumber: number) => {
        return availableRooms && availableRooms.sort((a: any, b: any) => {
            const roomNumberA = +roomEmailToNumberMap[a.scheduleId];
            const roomNumberB = +roomEmailToNumberMap[b.scheduleId];
            const distanceA = Math.abs(roomNumberA - currentRoomNumber);
            const distanceB = Math.abs(roomNumberB - currentRoomNumber);
            return distanceA - distanceB;
        });
    }

    const checkRoomAvailability = (scheduleItems: any) => {
        const now = format(currentTime, DATE_PATTERN);
        const endTime = getEndTime(now);

        return scheduleItems.every((item: any) => {
            const start = new Date(item.start.dateTime);
            const end = new Date(item.end.dateTime);

            // check whether the start of a scheduled meeting is the same as the end of the quick meeting to be scheduled
            if (start.getMinutes() === endTime.getMinutes() && roomStatus !== ROOM_STATUSES.BUSY) {
                return true;
            }

            // return true if the current time (or upcoming endTime of a meeting) does not overlap with the quick meeting to be scheduled
            return !(start < endTime && end > currentTime);
        });
    };

    const seeAvailableRooms = async () => {
        const data = await getRoomSchedule();
        if (!data) return;

        const currentRoom = roomEmailToNumberMap[sessionStorage.getItem(SELECTED_ROOM)!];
        const availableRoomsList = getAvailableRooms(data.value, currentRoom, "404");
        if (!availableRoomsList.length) {
            toast.error("No available rooms for the next 10 minutes!");
            setAvailableRooms(null);
            return;
        }
        setAvailableRooms(availableRoomsList);
        setSelectedOption(availableRoomsList[0]);
        setIsModalOpen(true);
    };

    const handleRoomSelect = (room: string) => {
        scheduleMeeting(room);
    };

    const scheduleMeeting = async (selectedRoom: string): Promise<any> => {
        const data = await getRoomSchedule();

        if (!data) {
            return;
        }

        setSchedules(data.value);

        const chosenRoomSchedule = data.value.find((room: any) => room.scheduleId === selectedRoom);

        if (!checkRoomAvailability(chosenRoomSchedule.scheduleItems)) {
            toast.error(`Room ${roomEmailToNumberMap[selectedRoom]} is not available anymore! Please choose another room.`);
            const filteredAvailableRooms = availableRooms?.filter((room: string) => room !== selectedRoom);
            setAvailableRooms(filteredAvailableRooms ?? null);
            setSelectedOption('');
            return;
        }

        try {
            const now = format(currentTime, DATE_PATTERN);
            const formattedEndTime = getEndTime(now).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

            const body = {
                subject: 'System Rooms',
                start: {
                    dateTime: now,
                    timeZone: TIMEZONE,
                },
                end: {
                    dateTime: formattedEndTime,
                    timeZone: TIMEZONE,
                },
                attendees: [
                    {
                        emailAddress: {
                            address: selectedOption,
                            name: roomEmailToNumberMap[selectedOption],
                        },
                        type: 'resource',
                    },
                ],
            };

            const token = sessionStorage.getItem(TOKEN);

            if (!token) {
                toast.error('No authentication token found.');
            }

            const scheduleMeetingUrl = `${BASE_URL}/schedule-meeting`;
            const response = await fetchHelper(scheduleMeetingUrl, token as string, body);

            if (!response.ok) {
                toast.error(`Failed to schedule meeting: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            toast.success(`Meeting successfully scheduled in Room ${roomEmailToNumberMap[selectedOption]}!`);

            setAvailableRooms(null);
            setSelectedOption('');
            setIsModalOpen(false);
            return data;
        } catch (error: any) {
            toast.error(`Failed to schedule meeting: ${error.message}`);
            throw new Error(`Failed to schedule meeting: ${error.message}`);
        }
    }

    const getNearestTenMinuteMark = (currentMinutes: number) => {
        let nearestTenMinuteMark = Math.ceil(currentMinutes / 10) * 10;

        if (nearestTenMinuteMark - currentMinutes <= 6) {
            nearestTenMinuteMark += 10;
        }

        return nearestTenMinuteMark;
    };

    const adjustEndTime = (date: Date, nearestTenMinuteMark: number) => {
        const endTime = new Date(date);

        if (nearestTenMinuteMark === 60) {
            endTime.setHours(endTime.getHours() + 1);
            endTime.setMinutes(0);
        } else {
            endTime.setMinutes(nearestTenMinuteMark);
        }

        if (endTime <= date) {
            endTime.setMinutes(endTime.getMinutes() + 10);
        }
        return endTime;
    };

    const formatMinutes = (minutes: number) => {
        return minutes.toString().padStart(2, '0');
    };

    const getEndTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const currentMinutes = date.getMinutes();

        const nearestTenMinuteMark = getNearestTenMinuteMark(currentMinutes);
        const endTime = adjustEndTime(date, nearestTenMinuteMark);

        const startTimeMins = formatMinutes(date.getMinutes());
        const endTimeMins = formatMinutes(endTime.getMinutes());

        setAvailableRoomInterval(`${date.getHours()}:${startTimeMins} - ${endTime.getHours()}:${endTimeMins}`);

        return endTime;
    };

    if (!sessionStorage.getItem(SELECTED_ROOM) || !sessionStorage.getItem("token")) {
        sessionStorage.clear();
        router.push("/login");
        return <></>;
    }
    return (
        <div>
            <div className="container">
                <div className="time-container">
                    <Typography className="typography time">{formatTime(currentTime)}</Typography>
                    {(() => {
                        switch (roomStatus) {
                            case ROOM_STATUSES.BUSY:
                                return (
                                    <Box className="current-meeting-information">
                                        <Box className="current-meeting-duration">
                                            <Typography variant="h4"
                                                        className="typography current-meeting-duration-info">{formatMeetingsTime(currentMeeting.start.dateTime)}</Typography>
                                            <Typography variant="h4"
                                                        className="typography current-meeting-duration-info">-</Typography>
                                            <Typography variant="h4"
                                                        className="typography current-meeting-duration-info">{formatMeetingsTime(currentMeeting.end.dateTime)}</Typography>
                                        </Box>
                                        <Typography variant="h4"
                                                    className="typography current-meeting-owner">{currentMeeting.subject.trim()}'s
                                            meeting</Typography>
                                    </Box>
                                );
                            case ROOM_STATUSES.STARTING_SOON:
                                return (
                                    <Box className="current-meeting-information">
                                        <Typography className="typography starting-soon-meeting-info">Starts
                                            in {startingSoonMeetingMinutes} {startingSoonMeetingMinutes === 1 ? 'minute' : 'minutes'}</Typography>
                                        <Typography
                                            className="typography starting-soon-meeting-name">{todaysMeetings[0].subject.trim()}'s
                                            meeting</Typography>
                                    </Box>
                                );
                            case ROOM_STATUSES.AVAILABLE:
                                return <Typography className="typography available-room">Available</Typography>;
                            default:
                                return null;
                        }
                    })()}
                    <Box className={`select-input-wrapper-home ${availableRoomsStyles}`}>
                        {schedules && <Button variant="outlined" className="available-rooms-btn"><FontAwesomeIcon
                            icon={faCalendarPlus} onClick={seeAvailableRooms}/></Button>}
                    </Box>
                </div>
                <div className="top-container">
                    <Box className={`overlay ${overlayStyles}`}></Box>
                </div>
                <div className="content-container">
                    <Box className="left-side">
                        {sessionStorage.getItem(SELECTED_ROOM) ?
                            roomEmailToNumberMap[sessionStorage.getItem(SELECTED_ROOM)!].split('').map((number, index) => (
                                <p key={index} className="number">{number}</p>
                            )) : ''
                        }
                    </Box>
                    <Box className="right-side">
                        <Box className="box">
                            <Typography variant="h6" className="typography next-meetings">Next meetings</Typography>
                            {roomStatus === ROOM_STATUSES.BUSY && busyRoomMeetings.length > 0 ? (
                                busyRoomMeetings.map((element: any, index: any) => (
                                    <Box className="meeting-information" key={index}>
                                        <Box className="meeting-duration">
                                            <Typography
                                                className="typography meeting-duration-info">{formatMeetingsTime(element.start.dateTime)}</Typography>
                                            <Typography className="typography meeting-duration-info">-</Typography>
                                            <Typography
                                                className="typography meeting-duration-info">{formatMeetingsTime(element.end.dateTime)}</Typography>
                                        </Box>
                                        <Typography variant="body2"
                                                    className="typography meeting-owner">{element.subject ? `${element.subject.trim()}'s meeting` : 'Error: Name is missing'}</Typography>
                                    </Box>
                                ))
                            ) : (roomStatus && roomStatus !== ROOM_STATUSES.BUSY) && todaysMeetings.length > 0 ? (
                                todaysMeetings.map((element: any, index: any) => (
                                    <Box className="meeting-information" key={index}>
                                        <Box className="meeting-duration">
                                            <Typography
                                                className="typography meeting-duration-info">{formatMeetingsTime(element.start.dateTime)}</Typography>
                                            <Typography className="typography meeting-duration-info">-</Typography>
                                            <Typography
                                                className="typography meeting-duration-info">{formatMeetingsTime(element.end.dateTime)}</Typography>
                                        </Box>
                                        <Typography
                                            className="typography meeting-owner">{element.subject ? `${element.subject.trim()}'s meeting` : 'Error: Name is missing'}</Typography>
                                    </Box>
                                ))
                            ) : (
                                <Typography variant="body1" className="typography no-meetings-message">No meetings for
                                    the rest of the day</Typography>
                            )}
                        </Box>
                    </Box>
                </div>
            </div>
            <ToastContainer/>
            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                aria-labelledby="modal-title"
                aria-describedby="modal-description"
            >
                <Box className="modal">
                    <Box className="modal-title">
                        <div className="modal-title-container">
                            <Typography variant="h5">Book room between</Typography>
                            <Typography variant="h5"
                                        className="availability-interval">{availableRoomInterval}</Typography>
                        </div>
                        <FontAwesomeIcon className="close-modal-icon" icon={faX} onClick={() => setIsModalOpen(false)}/>
                    </Box>
                    <List className="list-wrapper">
                        {availableRooms && availableRooms?.map((room, index) => (
                            <ListItem key={index} disablePadding>
                                <ListItemButton onClick={() => handleRoomSelect(room)} className="list-item-btn">
                                    Room {roomEmailToNumberMap[room]}
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Modal></div>
    );
};

export default HomePage;