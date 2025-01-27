"use client"; // We need client-side hooks

import {FormEvent, useState} from 'react';
import {useRouter} from "next/navigation";
import {Box, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography} from '@mui/material';
import {ToastContainer} from 'react-toastify';
import {SELECTED_ROOM, TOKEN} from '../constants/login';
import {getToken} from "../helpers/getTokenHelper";
import {roomEmailToNumberMap} from '../mappers/roomMapper';
import "../../assets/styles/login.scss"

const LoginPage = () => {
    const [selectedOption, setSelectedOption] = useState('');
    const router = useRouter();

    const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedOption) {
            return;
        }

        sessionStorage.setItem(SELECTED_ROOM, selectedOption);

        const token = await getToken();

        if (token) {
            sessionStorage.setItem(TOKEN, token);
            router.push('/home');
        }
    };

    const handleSelectRoomChange = (event: SelectChangeEvent<string>) => {
        setSelectedOption(event.target.value);
    };

    return (
        <>
            <Box className="login-container">
                <img src="../../../src/assets/images/logo-green.png" alt="Pine"/>
                <Typography
                    variant="h4"
                    gutterBottom
                    className="title"
                >
                    CleverPine Rooms
                </Typography>

                <form onSubmit={handleLogin} className="login-form">
                    <FormControl required fullWidth variant="outlined" sx={{m: 0}}>
                        <InputLabel>Select Room</InputLabel>
                        <Select
                            value={selectedOption}
                            label="Select Room"
                            onChange={handleSelectRoomChange}
                        >
                            {Object.entries(roomEmailToNumberMap).map(([email, number]) => (
                                <MenuItem key={email} value={email}>
                                    Room {number}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Button
                        type="submit"
                        variant="contained"
                        className={selectedOption ? "enabled-save login-button" : "login-button"}
                        disabled={!selectedOption}
                    >
                        Login
                    </Button>
                </form>
            </Box>
            <ToastContainer/>
        </>
    );
};

export default LoginPage;